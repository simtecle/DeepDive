'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowSquareOutIcon, PlayIcon } from '@phosphor-icons/react';
import { youTubeIdFromUrl, youtubeThumbnailCandidates } from '@/lib/youtubeThumb';

export type VideoCardVideo = {
  title: string;
  video_url: string;
  source_channel?: string | null;
  duration_min?: number | null;
  language?: string | null;
  level?: string | null;
};

export type VideoCardSize = 'snake' | 'grid';

type Props = {
  video: VideoCardVideo;
  size?: VideoCardSize;
  href?: string;
  priority?: boolean;
  className?: string;
  step?: number;
  featured?: boolean;
};

function formatDuration(minutes?: number | null): string | null {
  if (minutes == null || Number.isNaN(minutes)) return null;
  const total = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return hours > 0 ? `${hours}h ${mins.toString().padStart(2, '0')}m` : `${total} min`;
}

function languageLabel(language?: string | null) {
  if (!language) return null;
  if (language.toLowerCase() === 'en') return 'English';
  if (language.toLowerCase() === 'de') return 'German';
  return language;
}

export function VideoCard({
  video,
  size = 'grid',
  href,
  priority = false,
  className,
  step,
  featured = false,
}: Props) {
  const youtubeId = useMemo(() => youTubeIdFromUrl(video.video_url), [video.video_url]);
  const candidates = useMemo(() => (youtubeId ? youtubeThumbnailCandidates(youtubeId) : []), [youtubeId]);
  const [thumbIndex, setThumbIndex] = useState(0);

  useEffect(() => setThumbIndex(0), [youtubeId]);

  const metadata = [
    video.source_channel ?? null,
    languageLabel(video.language),
    formatDuration(video.duration_min),
  ].filter((value): value is string => Boolean(value?.trim()));

  const cardHref = href ?? video.video_url;
  const thumbUrl = candidates[thumbIndex] ?? null;
  const isTimeline = size === 'snake';

  return (
    <article
      className={[
        'group overflow-hidden rounded-[14px] border bg-[var(--surface)] transition-colors duration-200',
        featured ? 'border-[var(--border-strong)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]',
        isTimeline ? 'sm:grid sm:grid-cols-[minmax(190px,260px)_1fr]' : '',
        className ?? '',
      ].join(' ')}
    >
      <div className={['relative overflow-hidden bg-[var(--surface-raised)]', isTimeline ? 'aspect-video sm:aspect-auto sm:min-h-40' : 'aspect-video'].join(' ')}>
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.015]"
            onError={() => setThumbIndex((index) => (index + 1 < candidates.length ? index + 1 : index))}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[var(--foreground-muted)]">
            <PlayIcon size={30} weight="fill" aria-hidden="true" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.01_255/0.42)] to-transparent" />
        {featured && (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-ink)]">
            Start here
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col p-4 sm:p-5">
        {step !== undefined && (
          <span className="mb-2 text-xs font-semibold text-[var(--accent)]">Lesson {step}</span>
        )}
        <h3 className="line-clamp-2 text-base font-semibold leading-6 tracking-[-0.015em] text-[var(--foreground)] sm:text-lg">
          {video.title}
        </h3>
        {metadata.length > 0 && (
          <p className="mt-2 line-clamp-1 text-xs text-[var(--foreground-secondary)]">
            {metadata.join(' / ')}
          </p>
        )}
        <div className="mt-4 sm:mt-auto sm:pt-4">
          <Link
            href={cardHref}
            target={href ? undefined : '_blank'}
            rel={href ? undefined : 'noreferrer'}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] text-sm font-semibold text-[var(--foreground)] transition-colors hover:text-[var(--accent)]"
          >
            Watch on YouTube
            <ArrowSquareOutIcon size={17} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
