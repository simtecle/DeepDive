export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

function isAuthorized(req: NextRequest) {
  const expected = (process.env.CRON_SECRET ?? '').trim();
  if (!expected) return { ok: false as const, error: 'missing_cron_secret', status: 500 };

  // Official Vercel Cron auth:
  // When CRON_SECRET is set in Vercel Project Environment Variables, scheduled cron invocations
  // include `Authorization: Bearer <CRON_SECRET>` automatically.
  // Manual/curl calls must send the same bearer header.
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';

  if (token !== expected) return { ok: false as const, error: 'unauthorized', status: 401 };
  return { ok: true as const };
}

async function tryAcquireCronLock(req: NextRequest, lockKey: string, ttlSeconds: number) {
  // Fail-open: if the lock RPC/table is misconfigured, we prefer running the job rather than breaking cron.
  // This is safe because the job itself already limits work per run.
  try {
    const { data, error } = await supabaseServer.rpc('acquire_cron_lock', {
      p_job_name: lockKey,
      p_ttl_seconds: ttlSeconds,
      p_locked_by: req.headers.get('x-vercel-id') ?? req.headers.get('user-agent') ?? null,
    });

    if (error) return { ok: true, acquired: true, note: `lock_rpc_error:${error.message}` };
    return { ok: true, acquired: Boolean(data), note: null };
  } catch (e: any) {
    return { ok: true, acquired: true, note: `lock_rpc_exception:${String(e?.message ?? e)}` };
  }
}

export async function GET(req: NextRequest) {
  const authResult = isAuthorized(req);
  if (!authResult.ok) {
    return NextResponse.json({ ok: false, error: authResult.error }, { status: authResult.status });
  }

  const adminToken = process.env.ADMIN_TOKEN ?? '';
  if (!adminToken) {
    return NextResponse.json({ ok: false, error: 'missing_admin_token' }, { status: 500 });
  }

  // DB-backed cooldown lock (prevents overlapping/too-frequent runs).
  // Default: 1 hour.
  const lockKey = 'cron:classify-queued';
  const ttlSeconds = Number(process.env.CRON_LOCK_TTL_SECONDS ?? '3600');
  const safeTtl = Number.isFinite(ttlSeconds) ? Math.max(60, Math.floor(ttlSeconds)) : 3600;

  const lock = await tryAcquireCronLock(req, lockKey, safeTtl);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'lock_active', lockKey, ttlSeconds: safeTtl, lockNote: lock.note ?? null });
  }

  const origin = req.nextUrl.origin;

  // Conservative defaults to avoid timeouts and control OpenAI cost.
  const limit = Number(process.env.CRON_CLASSIFY_LIMIT ?? '40');
  const safeLimit = Number.isFinite(limit) ? Math.min(200, Math.max(1, Math.floor(limit))) : 40;

  const controller = new AbortController();
  const timeoutMs = 120_000;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${origin}/api/admin/classify-queued`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify({ limit: safeLimit }),
    });

    const text = await res.text();

    // Pass-through JSON if possible.
    try {
      const json = JSON.parse(text);
      return NextResponse.json({
        ok: true,
        upstreamStatus: res.status,
        limit: safeLimit,
        lockKey,
        ttlSeconds: safeTtl,
        lockNote: lock.note ?? null,
        result: json,
      });
    } catch {
      return NextResponse.json({
        ok: true,
        upstreamStatus: res.status,
        limit: safeLimit,
        lockKey,
        ttlSeconds: safeTtl,
        lockNote: lock.note ?? null,
        resultText: text,
      });
    }
  } catch (e: any) {
    const isAbort = e?.name === 'AbortError' || String(e?.message ?? '').toLowerCase().includes('aborted');
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        reason: isAbort ? 'timeout' : 'fetch_failed',
        error: isAbort ? null : String(e?.message ?? e),
        limit: safeLimit,
        lockKey,
        ttlSeconds: safeTtl,
        lockNote: lock.note ?? null,
      },
      { status: 200 },
    );
  } finally {
    clearTimeout(t);
  }
}