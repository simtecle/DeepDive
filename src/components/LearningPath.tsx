'use client';

import { useEffect, useMemo, useState } from 'react';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { VideoCard, type VideoCardVideo } from '@/components/VideoCard';

type Props = {
  title: string;
  videos: VideoCardVideo[];
  coreCount?: number;
  morePreviewCount?: number;
};

export function LearningPath({ title, videos, coreCount = 4, morePreviewCount = 3 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const resetKey = `${title}|${videos.length}|${videos[0]?.video_url ?? ''}`;

  useEffect(() => setExpanded(false), [resetKey]);

  const initialCount = Math.max(1, Math.min(videos.length, coreCount + morePreviewCount));
  const visibleVideos = useMemo(
    () => (expanded ? videos : videos.slice(0, initialCount)),
    [expanded, initialCount, videos],
  );
  const hiddenCount = Math.max(0, videos.length - initialCount);

  return (
    <section aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-heading`}>
      <header className="mb-5 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h2
            id={`${title.replace(/\s+/g, '-').toLowerCase()}-heading`}
            className="text-xl font-semibold tracking-[-0.025em]"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
            {videos.length} {videos.length === 1 ? 'lesson' : 'lessons'} in recommended order
          </p>
        </div>
        {videos.length > 0 && (
          <span className="hidden items-center gap-1.5 text-xs font-medium text-[var(--foreground-muted)] sm:flex">
            <CheckIcon size={15} weight="bold" className="text-[var(--accent)]" aria-hidden="true" />
            Curated sequence
          </span>
        )}
      </header>

      {videos.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[var(--border)] px-5 py-8 text-sm text-[var(--foreground-secondary)]">
          No videos are available for this level yet.
        </div>
      ) : (
        <div className="relative pl-7 sm:pl-10">
          <div className="absolute bottom-6 left-[7px] top-6 w-px bg-[var(--border)] sm:left-[11px]" aria-hidden="true" />
          <ol className="space-y-4">
            {visibleVideos.map((video, index) => (
              <li key={`${video.video_url}-${index}`} className="relative">
                <span
                  className={[
                    'absolute -left-7 top-6 z-10 grid size-[15px] place-items-center rounded-full border sm:-left-10 sm:size-6',
                    index === 0
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'border-[var(--border-strong)] bg-[var(--background)] text-[var(--foreground-muted)]',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  <span className="hidden text-[10px] font-bold sm:block">{index + 1}</span>
                </span>
                <VideoCard video={video} size="snake" step={index + 1} featured={index === 0} priority={index === 0} />
              </li>
            ))}
          </ol>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--background-subtle)] px-4 text-sm font-semibold text-[var(--foreground-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
            >
              {expanded ? 'Show fewer lessons' : `Show ${hiddenCount} more ${hiddenCount === 1 ? 'lesson' : 'lessons'}`}
              <CaretDownIcon className={expanded ? 'rotate-180' : ''} size={16} weight="bold" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
