import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const expected = (process.env.CRON_SECRET ?? '').trim();
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'missing_cron_secret' }, { status: 500 });
  }

  // Official Vercel Cron auth:
  // When CRON_SECRET is set in Vercel Project Environment Variables, scheduled cron invocations
  // include `Authorization: Bearer <CRON_SECRET>` automatically.
  // Manual/curl calls must send the same bearer header.
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';

  if (token !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const adminToken = process.env.ADMIN_TOKEN ?? '';
  if (!adminToken) {
    return NextResponse.json({ ok: false, error: 'missing_admin_token' }, { status: 500 });
  }

  // DB-backed cooldown lock to prevent overlapping / repeated runs.
  // TTL default: 1 hour.
  const lockKey = 'cron:process-topic-requests';
  const ttlSecondsRaw = Number(process.env.CRON_LOCK_TTL_SECONDS ?? '3600');
  const ttlSeconds = Number.isFinite(ttlSecondsRaw) ? Math.max(60, Math.floor(ttlSecondsRaw)) : 3600;

  // Try to acquire lock. Fail-open if the RPC/table is missing or misconfigured.
  let acquired = true;
  let lockNote: string | null = null;
  try {
    const { data, error } = await supabaseServer.rpc('acquire_cron_lock', {
      p_job_name: lockKey,
      p_ttl_seconds: ttlSeconds,
      p_locked_by: req.headers.get('x-vercel-id') ?? req.headers.get('user-agent') ?? null,
    });

    if (error) {
      lockNote = `lock_rpc_error:${error.message}`;
      acquired = true;
    } else {
      acquired = Boolean(data);
    }
  } catch (e: any) {
    lockNote = `lock_rpc_exception:${String(e?.message ?? e)}`;
    acquired = true;
  }

  if (!acquired) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'lock_active', lockKey, ttlSeconds, lockNote }, { status: 200 });
  }

  const origin = req.nextUrl.origin;

  // Call your existing admin processor (POST) internally.
  // IMPORTANT: keep this job small to avoid Vercel execution timeouts.
  const controller = new AbortController();
  // Keep below typical serverless timeouts. If we time out, return a safe "skipped" response.
  const timeoutMs = 120_000;
  const t = setTimeout(() => controller.abort(), timeoutMs);

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
        maxTopics: Number(process.env.CRON_MAX_TOPICS ?? '3'),
        // This is a request-count lookback for deduping/picking, not a date window.
        lookback: Number(process.env.CRON_LOOKBACK ?? process.env.CRON_LOOKBACK_DAYS ?? '30'),
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
      {
        ok: true,
        skipped: true,
        reason: isAbort ? 'timeout' : 'fetch_failed',
        error: isAbort ? null : String(e?.message ?? e),
        lockKey,
        ttlSeconds,
        lockNote,
      },
      { status: 200 }
    );
  }
}