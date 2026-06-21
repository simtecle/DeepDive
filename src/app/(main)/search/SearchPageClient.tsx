'use client';

import { useEffect, useState } from 'react';
import { LearningPath } from '@/components/LearningPath';
import { useRouter, useSearchParams } from 'next/navigation';
import { useVideos } from '@/hooks/useVideos';
import { SearchBar } from '@/components/SearchBar';
import { CheckCircleIcon, ClockIcon, PlusCircleIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react';

type ResolveTopicResponse =
  | { ok: true; topic_name: string; topic_key: string; match_type: string; score: number }
  | { ok: false; reason?: string; error?: string };

type TopicSuggestion = { topic_name: string; published_count: number };

type TopTopicsResponse =
  | { ok: true; topics: TopicSuggestion[] }
  | { ok: false; error?: string };

function normalizeForMatch(s: string) {
  return (s ?? '').trim().toLowerCase();
}

function sortSuggestions(query: string, list: TopicSuggestion[]) {
  const q = normalizeForMatch(query);
  const scored = (list ?? []).map((s) => {
    const name = normalizeForMatch(s.topic_name);
    const starts = q && name.startsWith(q) ? 0 : 1;
    const contains = q && name.includes(q) ? 0 : 1;
    return { s, starts, contains };
  });
  scored.sort((a, b) => {
    if (a.starts !== b.starts) return a.starts - b.starts;
    if (a.contains !== b.contains) return a.contains - b.contains;
    if ((b.s.published_count ?? 0) !== (a.s.published_count ?? 0)) return (b.s.published_count ?? 0) - (a.s.published_count ?? 0);
    return a.s.topic_name.localeCompare(b.s.topic_name);
  });
  return scored.map((x) => x.s);
}

export default function SearchPageClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const qParam = (sp.get('q') ?? '').trim();
  const levelParam = (sp.get('level') ?? '').trim();
  const langParam = (sp.get('lang') ?? '').trim();

  const { videos, tracks, loading, searchVideos } = useVideos();
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [level, setLevel] = useState('');
  const [requestStatus, setRequestStatus] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestConfirmOpen, setRequestConfirmOpen] = useState(false);
  const [requestTone, setRequestTone] = useState<'neutral' | 'success' | 'error'>('neutral');
  const [autoKey, setAutoKey] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearched, setLastSearched] = useState<{ q: string; language: string; level: string } | null>(null);
  const [noCanonicalMatch, setNoCanonicalMatch] = useState(false);

  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(false);

  useEffect(() => {
    if (qParam && qParam !== search) setSearch(qParam);

    const allowedLevels = new Set(['Beginner', 'Intermediate', 'Advanced']);
    if (allowedLevels.has(levelParam) && levelParam !== level) {
      setLevel(levelParam);
    }

    if (langParam && langParam !== language) setLanguage(langParam);

    setHasSearched(false);
    setNoCanonicalMatch(false);
    setSuggestions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam, levelParam, langParam]);

  async function resolveAndSearch(rawInput: string, lang: string, lvl: string, opts?: { syncUrl?: boolean }) {
    const raw = (rawInput ?? '').trim();
    if (!raw) return;

    setRequestStatus('');
    setRequestConfirmOpen(false);
    setRequestTone('neutral');
    setNoCanonicalMatch(false);
    setSuggestions([]);

    // Resolve canonical topic first to avoid mixed/approximate matches.
    let resolvedName = '';
    try {
      const res = await fetch(`/api/resolve-topic?q=${encodeURIComponent(raw)}`);
      const data = (await res.json()) as ResolveTopicResponse;
      if (res.ok && data && 'ok' in data && data.ok) {
        resolvedName = data.topic_name;
      }
    } catch {
      // ignore
    }

    setHasSearched(true);
    setLastSearched({ q: raw, language: lang, level: lvl });

    if (!resolvedName) {
      setNoCanonicalMatch(true);
      return;
    }

    // Optionally keep URL in sync (shareable). Use canonical topic name in the URL.
    if (opts?.syncUrl) {
      const params = new URLSearchParams();
      params.set('q', resolvedName);
      if (lvl) params.set('level', lvl);
      if (lang) params.set('lang', lang);
      const nextUrl = `/search?${params.toString()}`;

      // Avoid triggering a pointless navigation loop.
      const currentLangParam = (sp.get('lang') ?? '').trim();
      if (qParam !== resolvedName || levelParam !== lvl || currentLangParam !== lang) {
        router.replace(nextUrl);
      }
    }

    await searchVideos(resolvedName, lang, lvl);
  }

  useEffect(() => {
    const q = qParam;
    if (!q) return;

    const allowedLevels = new Set(['', 'Beginner', 'Intermediate', 'Advanced']);
    const lvl = allowedLevels.has(levelParam) ? levelParam : '';

    const key = JSON.stringify({ q, language: langParam || language, level: lvl });
    if (key === autoKey) return;

    const run = async () => {
      setAutoKey(key);
      const raw = q;
      const lang = langParam || language;
      await resolveAndSearch(raw, lang, lvl, { syncUrl: false });
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam, levelParam, langParam, language]);

  // When we have no canonical match (or no videos after a search), fetch "Did you mean" suggestions.
  useEffect(() => {
    const q = (lastSearched?.q ?? '').trim();
    if (!hasSearched) return;
    if (!q) return;

    const shouldSuggest = noCanonicalMatch || (!loading && videos.length === 0);
    if (!shouldSuggest) return;

    const run = async () => {
      setSuggestBusy(true);
      try {
        const res = await fetch(`/api/top-topics?q=${encodeURIComponent(q)}&limit=6`);
        const data = (await res.json()) as TopTopicsResponse;
        if (res.ok && data && 'ok' in data && data.ok) {
          const list = Array.isArray(data.topics) ? data.topics : [];
          setSuggestions(sortSuggestions(q, list));
          // If no close matches by substring, fall back to popular topics.
          if (list.length === 0) {
            const res2 = await fetch(`/api/top-topics?limit=6`);
            const data2 = (await res2.json()) as TopTopicsResponse;
            if (res2.ok && data2 && 'ok' in data2 && data2.ok) {
              setSuggestions(sortSuggestions(q, Array.isArray(data2.topics) ? data2.topics : []));
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setSuggestBusy(false);
      }
    };

    void run();
  }, [hasSearched, noCanonicalMatch, loading, videos.length, lastSearched]);

  function goToTopic(t: string) {
    const next = (t ?? '').trim();
    if (!next) return;

    // Keep local input in sync immediately.
    setSearch(next);

    const params = new URLSearchParams();
    params.set('q', next);
    if (level) params.set('level', level);
    if (language) params.set('lang', language);
    router.replace(`/search?${params.toString()}`);

    // Trigger search immediately so the click feels responsive.
    void resolveAndSearch(next, language, level, { syncUrl: false });
  }

  async function submitTopicRequest() {
    const q = (lastSearched?.q ?? '').trim();
    if (!q) return;

    setRequestBusy(true);
    setRequestTone('neutral');
    setRequestStatus('Submitting your request…');

    try {
      const res = await fetch('/api/request-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_raw: q }),
      });

      if (res.status === 429) {
        setRequestTone('error');
        setRequestStatus('Rate limit reached. Try again later.');
        return;
      }

      const data: unknown = await res.json();
      const accepted =
        typeof data === 'object' &&
        data !== null &&
        'accepted' in data &&
        (data as { accepted: boolean }).accepted === true;

      setRequestTone(accepted ? 'success' : 'error');
      setRequestStatus(accepted ? 'Request submitted. Check back later.' : 'Request failed. Try again.');
      if (accepted) setRequestConfirmOpen(false);
    } catch {
      setRequestTone('error');
      setRequestStatus('Request failed. Try again.');
    } finally {
      setRequestBusy(false);
    }
  }

  return (
    <main className="space-y-9">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Build a learning path</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)] sm:text-base">
          Search the curated library and follow each level in recommended order.
        </p>
      </header>

      <div className="sticky top-[68px] z-[var(--z-sticky)] rounded-[14px] border border-[var(--border)] bg-[var(--background-subtle)] p-4 sm:p-5 md:top-3">
        <SearchBar
          search={search}
          language={language}
          level={level}
          onSearchChange={(v) => {
            setSearch(v);
            setHasSearched(false);
          }}
          onLanguageChange={(v) => {
            setLanguage(v);
            setHasSearched(false);
          }}
          onLevelChange={(v) => {
            setLevel(v);
            setHasSearched(false);
          }}
          onSubmit={async () => {
            const raw = search.trim();
            if (!raw) return;
            await resolveAndSearch(raw, language, level, { syncUrl: true });
          }}
        />
      </div>

      {loading ? (
        <div className="space-y-4" aria-label="Loading learning path" aria-live="polite">
          <div className="dd-skeleton h-7 w-48 rounded-[8px]" />
          {[0, 1, 2].map((item) => (
            <div key={item} className="dd-skeleton h-44 rounded-[14px]" />
          ))}
        </div>
      ) : !hasSearched ? (
        <div className="rounded-[14px] border border-dashed border-[var(--border)] px-6 py-12 text-center">
          <ClockIcon className="mx-auto text-[var(--accent)]" size={28} weight="duotone" aria-hidden="true" />
          <p className="mt-4 font-medium">Your next path starts with a topic.</p>
          <p className="mt-1 text-sm text-[var(--foreground-secondary)]">Try a subject, skill, person, or idea above.</p>
        </div>
      ) : noCanonicalMatch || videos.length === 0 ? (
        <div className="max-w-3xl rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
          <WarningCircleIcon size={26} weight="duotone" className="text-[var(--accent)]" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold tracking-[-0.02em]">We do not have this topic yet</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">
            Choose a related topic below, refine your search, or request this topic for the library.
          </p>

          {(suggestBusy || suggestions.length > 0) && (
            <div className="mt-6 space-y-2">
              <div className="text-sm font-medium">Related topics</div>
              {suggestBusy ? (
                <div className="flex gap-2" aria-label="Looking for related topics">
                  <span className="dd-skeleton h-9 w-24 rounded-full" />
                  <span className="dd-skeleton h-9 w-32 rounded-full" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s.topic_name}
                      type="button"
                      onClick={() => goToTopic(s.topic_name)}
                      className="min-h-9 rounded-full border border-[var(--border)] bg-[var(--background-subtle)] px-3 text-xs text-[var(--foreground-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                      title={`${s.published_count} videos`}
                    >
                      {s.topic_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-7 border-t border-[var(--border)] pt-6">
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={requestBusy}
              onClick={() => setRequestConfirmOpen(true)}
            >
              <PlusCircleIcon size={18} weight="bold" aria-hidden="true" />
              Request this topic
            </button>

            {requestConfirmOpen && (
              <div className="mt-4 rounded-[10px] border border-[var(--border)] bg-[var(--background-subtle)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">Add “{lastSearched?.q}” to the request queue?</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--foreground-secondary)]">
                      DeepDive will automatically source and classify suitable videos.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Cancel topic request"
                    onClick={() => setRequestConfirmOpen(false)}
                    className="grid size-11 shrink-0 place-items-center rounded-[10px] text-[var(--foreground-secondary)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                  >
                    <XIcon size={18} aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void submitTopicRequest()}
                    disabled={requestBusy}
                    className="min-h-11 rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-60"
                  >
                    {requestBusy ? 'Submitting…' : 'Confirm request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestConfirmOpen(false)}
                    className="min-h-11 rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {requestStatus && (
              <p
                className={[
                  'mt-4 flex items-center gap-2 text-sm',
                  requestTone === 'success'
                    ? 'text-[var(--success)]'
                    : requestTone === 'error'
                      ? 'text-[var(--error)]'
                      : 'text-[var(--foreground-secondary)]',
                ].join(' ')}
                aria-live="polite"
              >
                {requestTone === 'success' && <CheckCircleIcon size={18} weight="fill" aria-hidden="true" />}
                {requestStatus}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-16">
          <LearningPath title="Beginner Track" videos={tracks?.Beginner?.items ?? []} coreCount={4} morePreviewCount={3} />
          <LearningPath title="Intermediate Track" videos={tracks?.Intermediate?.items ?? []} coreCount={4} morePreviewCount={3} />
          <LearningPath title="Advanced Track" videos={tracks?.Advanced?.items ?? []} coreCount={4} morePreviewCount={3} />
        </div>
      )}
    </main>
  );
}
