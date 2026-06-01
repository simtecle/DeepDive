import { supabaseServer } from '@/lib/supabaseServer';

type ImportParams = {
  query: string;
  maxResults: number;
  language?: string; // 'en' etc.
};

type YtSearchItem = { id?: { videoId?: string } };
type YtSearchResp = { items?: YtSearchItem[] };

type YtVideosItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    defaultAudioLanguage?: string;
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
};
type YtVideosResp = { items?: YtVideosItem[] };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url: string, opts: { timeoutMs: number; retry?: number }): Promise<Response> {
  const retry = Math.max(0, Math.min(2, Math.floor(opts.retry ?? 0)));

  for (let attempt = 0; attempt <= retry; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), opts.timeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });

      // Retry on transient server errors.
      if (!res.ok && res.status >= 500 && res.status < 600 && attempt < retry) {
        await sleep(300 * (attempt + 1));
        continue;
      }

      return res;
    } catch (e: any) {
      const isAbort = e?.name === 'AbortError' || String(e?.message ?? '').toLowerCase().includes('aborted');
      const isTransient = isAbort || String(e?.message ?? '').toLowerCase().includes('timeout');
      if (attempt < retry && isTransient) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }

  // unreachable
  throw new Error('fetch_failed');
}

function youtubeTimeoutMs() {
  // Keep per-request time bounded so cron jobs don't hang.
  // Env override lets you tune without redeploy.
  const v = Number(process.env.YOUTUBE_FETCH_TIMEOUT_MS ?? '17000');
  return Number.isFinite(v) ? Math.min(60000, Math.max(3000, Math.floor(v))) : 12000;
}

function parseIsoDurationToMinutes(iso: string): number | null {
  // PT#H#M#S
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  const min = m[2] ? Number(m[2]) : 0;
  const s = m[3] ? Number(m[3]) : 0;
  const total = h * 60 + min + (s > 0 ? 1 : 0);
  return Number.isFinite(total) && total > 0 ? total : null;
}

function numericStringOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return /^\d+$/.test(s) ? s : null;
}

export async function importFromYouTube(params: ImportParams): Promise<{
  attempted: number;
  upserted: number;
}> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('missing YOUTUBE_API_KEY');

  const maxResults = Math.max(1, Math.min(50, params.maxResults));

  // 1) Search -> video IDs
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('q', params.query);
  searchUrl.searchParams.set('maxResults', String(maxResults));
  searchUrl.searchParams.set('key', key);
  if (params.language) searchUrl.searchParams.set('relevanceLanguage', params.language);

  const sRes = await fetchWithTimeout(searchUrl.toString(), { timeoutMs: youtubeTimeoutMs(), retry: 1 });
  if (!sRes.ok) throw new Error(`youtube_search_error:${sRes.status}:${await sRes.text()}`);
  const sJson = (await sRes.json()) as YtSearchResp;

  const ids = (sJson.items ?? [])
    .map((i) => i.id?.videoId)
    .filter((x): x is string => Boolean(x));

  if (ids.length === 0) return { attempted: 0, upserted: 0 };

  // 2) Videos -> metadata + stats + duration
  const vidsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  vidsUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
  vidsUrl.searchParams.set('id', ids.join(','));
  vidsUrl.searchParams.set('key', key);

  const vRes = await fetchWithTimeout(vidsUrl.toString(), { timeoutMs: youtubeTimeoutMs(), retry: 1 });
  if (!vRes.ok) throw new Error(`youtube_videos_error:${vRes.status}:${await vRes.text()}`);
  const vJson = (await vRes.json()) as YtVideosResp;

  const rows = (vJson.items ?? []).map((v) => {
    const yt_video_id = v.id ?? null;
    const title = v.snippet?.title ?? '';
    const description = v.snippet?.description ?? null;
    const source_channel = v.snippet?.channelTitle ?? null;
    const published_at = v.snippet?.publishedAt ?? null;
    const language = v.snippet?.defaultAudioLanguage ?? params.language ?? 'en';
    const duration_min = parseIsoDurationToMinutes(v.contentDetails?.duration ?? '') ?? null;

    const view_count = numericStringOrNull(v.statistics?.viewCount);
    const like_count = numericStringOrNull(v.statistics?.likeCount);
    const comment_count = numericStringOrNull(v.statistics?.commentCount);

    const video_url = yt_video_id ? `https://www.youtube.com/watch?v=${yt_video_id}` : '';

    return {
      yt_video_id,
      title,
      description,
      source_channel,
      video_url,
      language,
      duration_min,
      view_count,
      like_count,
      comment_count,
      status: 'queued',
      is_active: false,
      published_at,
    };
  });

  // Upsert: allow backfill on duplicates
  const { data, error } = await supabaseServer
    .from('videos')
    .upsert(rows, { onConflict: 'video_url' })
    .select('id');

  if (error) throw new Error(`db_upsert_error:${error.message}`);

  return { attempted: rows.length, upserted: (data ?? []).length };
}