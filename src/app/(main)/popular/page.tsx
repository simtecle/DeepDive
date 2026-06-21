'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRightIcon, CompassIcon } from '@phosphor-icons/react';

type PopularTopic = {
  topic: string;
  publishedCount: number;
};

export default function PopularPage() {
  const [topics, setTopics] = useState<PopularTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Add a timestamp to avoid any caching issues in browsers/CDNs.
        const res = await fetch(`/api/top-topics?ts=${Date.now()}`);

        const contentType = res.headers.get('content-type') ?? '';
        const raw = await res.text();
        const json: unknown = contentType.includes('application/json')
          ? (() => {
              try {
                return JSON.parse(raw) as unknown;
              } catch {
                return undefined;
              }
            })()
          : undefined;

        if (!res.ok) {
          const msg =
            json && typeof json === 'object' && 'error' in (json as Record<string, unknown>)
              ? String((json as Record<string, unknown>).error ?? 'Failed to load top topics')
              : `Failed to load top topics (HTTP ${res.status})`;
          throw new Error(msg);
        }

        const items = (() => {
          if (typeof json !== 'object' || json === null) return undefined;
          const obj = json as Record<string, unknown>;
          const cand =
            obj.topics ??
            obj.items ??
            obj.data ??
            obj.results ??
            (obj.topics as unknown);
          return Array.isArray(cand) ? (cand as unknown[]) : undefined;
        })();

        if (!items) throw new Error('Invalid response from /api/top-topics');

        // Normalize item shape defensively.
        const normalized: PopularTopic[] = items
          .map((it) => {
            if (typeof it !== 'object' || it === null) return null;
            const rec = it as Record<string, unknown>;
            const topic = String(rec.topic ?? rec.topic_name ?? rec.name ?? '');
            const publishedCount = Number(rec.publishedCount ?? rec.published_count ?? rec.count ?? 0);
            if (!topic) return null;
            return { topic, publishedCount };
          })
          .filter((x): x is PopularTopic => Boolean(x));

        if (!cancelled) setTopics(normalized);
        return;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="space-y-8">
      <header className="max-w-2xl">
        <CompassIcon size={30} weight="duotone" className="mb-5 text-[var(--accent)]" aria-hidden="true" />
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Popular topics</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)] sm:text-base">
          Topics with the most published videos in the library.
        </p>
      </header>

      {loading && (
        <div className="space-y-2" aria-label="Loading popular topics">
          {[0, 1, 2, 3, 4].map((item) => <div key={item} className="dd-skeleton h-[72px] rounded-[10px]" />)}
        </div>
      )}
      {error && (
        <div className="rounded-[10px] border border-[color-mix(in_oklch,var(--error)_45%,var(--border))] bg-[var(--surface)] p-4 text-sm text-[var(--error)]">
          Could not load popular topics. {error}
        </div>
      )}

      {!loading && !error && topics.length === 0 && (
        <div className="rounded-[14px] border border-dashed border-[var(--border)] px-6 py-10 text-center text-sm text-[var(--foreground-secondary)]">
          No popular topics yet. Check back as the library grows.
        </div>
      )}

      {!loading && !error && topics.length > 0 && (
        <ol className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
          {topics.map((t, index) => (
            <li
              key={t.topic}
              className="border-b border-[var(--border)] last:border-b-0"
            >
              <Link
                className="group flex min-h-[72px] items-center gap-4 px-4 py-3 transition-colors hover:bg-[var(--surface-raised)] sm:px-5"
                href={`/search?q=${encodeURIComponent(t.topic)}`}
              >
                <span className="w-7 shrink-0 text-center text-sm font-semibold text-[var(--accent)]">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{t.topic}</div>
                  <div className="mt-0.5 text-xs text-[var(--foreground-secondary)]">
                    {t.publishedCount} published {t.publishedCount === 1 ? 'video' : 'videos'}
                  </div>
                </div>
                <ArrowRightIcon className="text-[var(--foreground-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--foreground)]" size={18} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
