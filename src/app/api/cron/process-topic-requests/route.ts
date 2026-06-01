import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;

  // Auth options:
  //  1) Manual/curl: Authorization: Bearer <CRON_SECRET>
  //  2) Vercel Cron: request contains Vercel cron + platform headers.
  // Notes:
  //  - Vercel's cron header value can vary; treat presence as the signal.
  //  - Additional Vercel-specific headers reduce accidental exposure.
  const isAuthed = Boolean(expected) && auth === `Bearer ${expected}`;

  const ua = (req.headers.get('user-agent') ?? '').toLowerCase();
  const hasCronHeader = req.headers.has('x-vercel-cron');
  const hasVercelId = req.headers.has('x-vercel-id');
  const hasMatchedPath = req.headers.has('x-matched-path');
  const isVercelCron = hasCronHeader && (ua.includes('vercel-cron') || ua.includes('vercel')) && hasVercelId && hasMatchedPath;

  if (!isAuthed && !isVercelCron) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const origin = req.nextUrl.origin;

  // Call your existing admin processor (POST) internally.
  // IMPORTANT: keep this job small to avoid Vercel execution timeouts.
  const controller = new AbortController();
  // Keep below typical serverless timeouts. If we time out, return a safe "skipped" response.
  const timeoutMs = 20_000;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  const adminToken = process.env.ADMIN_TOKEN ?? '';
  if (!adminToken) {
    return NextResponse.json({ ok: false, error: 'missing_admin_token' }, { status: 500 });
  }

  try {
    const res = await fetch(`${origin}/api/admin/process-topic-requests`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify({
        // Import-first. Keep classify limited (or move classify to its own cron).
        mode: 'import_only',
        // Keep small to reduce timeout risk.
        maxTopics: Number(process.env.CRON_MAX_TOPICS ?? '4'),
        lookback: Number(process.env.CRON_LOOKBACK_DAYS ?? '30'),
        maxPerQuery: Number(process.env.CRON_MAX_PER_QUERY ?? '15'),
        language: process.env.CRON_LANGUAGE ?? 'en',
        // Classify is handled by a separate cron.
        classifyLimit: 0,
        queueCeiling: Number(process.env.REQUEST_QUEUE_CEILING ?? '120'),
      }),
    }).finally(() => clearTimeout(t));

    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    clearTimeout(t);
    const isAbort = e?.name === 'AbortError' || String(e?.message ?? '').toLowerCase().includes('aborted');
    // Cron should not fail hard on timeout; just report it.
    return NextResponse.json(
      { ok: true, skipped: true, reason: isAbort ? 'timeout' : 'fetch_failed', error: isAbort ? null : String(e?.message ?? e) },
      { status: 200 }
    );
  }
}