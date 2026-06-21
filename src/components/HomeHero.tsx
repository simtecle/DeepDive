'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, ArrowUpRightIcon, CompassIcon } from '@phosphor-icons/react';

type Level = '' | 'Beginner' | 'Intermediate' | 'Advanced';
type Lang = '' | 'en' | 'de';

const STARTING_POINTS = [
  { topic: 'Python', note: 'Build something useful' },
  { topic: 'Psychology', note: 'Understand how we think' },
  { topic: 'Linear algebra', note: 'Make the abstract click' },
  { topic: 'Greek mythology', note: 'Follow an old story' },
  { topic: 'Microeconomics', note: 'See everyday incentives' },
  { topic: 'Metabolism', note: 'Learn how energy moves' },
];

const PATH_LEVELS = [
  { level: 'Beginner', note: 'Find the foundation' },
  { level: 'Intermediate', note: 'Connect the ideas' },
  { level: 'Advanced', note: 'Go deeper' },
];

export function HomeHero() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<Level>('');
  const [lang, setLang] = useState<Lang>('');
  const canSubmit = useMemo(() => query.trim().length >= 2, [query]);

  function goToSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    const params = new URLSearchParams({ q });
    if (level) params.set('level', level);
    if (lang) params.set('lang', lang);
    router.push(`/search?${params.toString()}`);
  }

  function chooseTopic(topic: string) {
    setQuery(topic);
    inputRef.current?.focus();
  }

  return (
    <section className="py-2 sm:py-6 lg:py-8">
      <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="grid lg:grid-cols-[minmax(320px,0.84fr)_minmax(500px,1.16fr)]">
          <div className="flex flex-col border-b border-[var(--border)] p-6 sm:p-8 lg:min-h-[560px] lg:border-b-0 lg:border-r lg:p-10 xl:p-12">
            <div className="flex items-center gap-2.5 text-sm font-medium text-[var(--accent)]">
              <CompassIcon size={19} weight="duotone" aria-hidden="true" />
              Start anywhere
            </div>

            <h1 className="mt-7 max-w-[11ch] text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] text-balance sm:text-5xl xl:text-[3.45rem]">
              There’s a clear way into every topic.
            </h1>
            <p className="mt-5 max-w-[42ch] text-base leading-7 text-[var(--foreground-secondary)] text-pretty">
              Tell us what you are curious about. DeepDive turns it into a focused YouTube curriculum you can follow in order.
            </p>

            <div className="mt-10 lg:mt-auto lg:pt-12">
              <p className="text-xs font-medium text-[var(--foreground-muted)]">Your path, mapped by depth</p>
              <ol className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {PATH_LEVELS.map(({ level: pathLevel, note }, index) => (
                  <li key={pathLevel} className="relative flex items-center gap-3">
                    {index < PATH_LEVELS.length - 1 && (
                      <span
                        className="absolute left-[11px] top-7 hidden h-7 w-px bg-[var(--border-strong)] lg:block"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={[
                        'relative z-10 grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold',
                        index === 0
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                          : 'border-[var(--border-strong)] bg-[var(--background-subtle)] text-[var(--foreground-secondary)]',
                      ].join(' ')}
                    >
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-[var(--foreground)]">{pathLevel}</span>
                      <span className="block text-xs text-[var(--foreground-muted)]">{note}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="flex flex-col p-6 sm:p-8 lg:p-10 xl:p-12">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                goToSearch();
              }}
            >
              <label htmlFor="home-search" className="text-sm font-semibold text-[var(--foreground)]">
                Where should we begin?
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  id="home-search"
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Type any subject, skill, or idea"
                  className="min-h-16 min-w-0 flex-1 rounded-[10px] border border-[var(--border-strong)] bg-[var(--background)] px-5 text-base text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] transition-colors hover:border-[var(--foreground-muted)] focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex min-h-16 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Map the path
                  <ArrowRightIcon size={17} weight="bold" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-medium text-[var(--foreground-secondary)]">
                  Start at
                  <select
                    value={level}
                    onChange={(event) => setLevel(event.target.value as Level)}
                    className="min-h-11 rounded-[10px] border border-[var(--border)] bg-[var(--background-subtle)] px-3 text-sm text-[var(--foreground)] transition-colors hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    <option value="">Any level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </label>
                <label className="grid gap-2 text-xs font-medium text-[var(--foreground-secondary)]">
                  Watch in
                  <select
                    value={lang}
                    onChange={(event) => setLang(event.target.value as Lang)}
                    className="min-h-11 rounded-[10px] border border-[var(--border)] bg-[var(--background-subtle)] px-3 text-sm text-[var(--foreground)] transition-colors hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    <option value="">Any language</option>
                    <option value="en">English</option>
                    <option value="de">German</option>
                  </select>
                </label>
              </div>
            </form>

            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold">Not sure where to start?</h2>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">Pick a direction and make it your own.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-x-5 sm:grid-cols-2">
                {STARTING_POINTS.map(({ topic, note }) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => chooseTopic(topic)}
                    className="group flex min-h-[68px] items-center justify-between gap-3 border-b border-[var(--border)] text-left transition-colors hover:text-[var(--accent)] active:translate-y-px"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--accent)]">{topic}</span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--foreground-muted)]">{note}</span>
                    </span>
                    <ArrowUpRightIcon className="shrink-0 text-[var(--foreground-muted)] group-hover:text-[var(--accent)]" size={17} weight="bold" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-6 text-xs leading-5 text-[var(--foreground-muted)]">
              Missing topic? Request it after searching and DeepDive will add it to the library queue.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
