import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

function isAuthorized(req: NextRequest) {
  const expected = process.env.CRON_SECRET ?? '';
  const auth = req.headers.get('authorization') ?? '';
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';

  // Allow scheduled Vercel cron OR manual bearer auth.
  if (isVercelCron) return true;
  if (!expected) return false;
  return auth === `Bearer ${expected}`;
}

async function tryAcquireCronLock(lockKey: string, ttlSeconds: number) {
  // Fail-open: if the lock RPC/table is misconfigured, we prefer running the job rather than breaking cron.
  // This is safe because the job itself already limits work per run.
  try {
    const { data, error } = await supabaseServer.rpc('try_acquire_cron_lock', {
      p_key: lockKey,
      p_ttl_seconds: ttlSeconds,
    });
    if (error) return { ok: true, acquired: true, note: `lock_rpc_error:${error.message}` };
    return { ok: true, acquired: Boolean(data) };
  } catch (e: any) {
    return { ok: true, acquired: true, note: `lock_rpc_exception:${String(e?.message ?? e)}` };
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // DB-backed cooldown lock (prevents overlapping/too-frequent runs).
  // Default: 1 hour.
  const lockKey = 'cron:classify-queued';
  const ttlSeconds = Number(process.env.CRON_LOCK_TTL_SECONDS ?? '3600');
  const safeTtl = Number.isFinite(ttlSeconds) ? Math.max(60, Math.floor(ttlSeconds)) : 3600;

  const lock = await tryAcquireCronLock(lockKey, safeTtl);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'lock_active', lockKey, ttlSeconds: safeTtl });
  }

  const adminToken = process.env.ADMIN_TOKEN ?? '';
  if (!adminToken) {
    return NextResponse.json({ ok: false, error: 'missing_admin_token' }, { status: 500 });
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
    return NextResponse.json(
      {
        ok: false,
        error: 'timeout_or_fetch_failed',
        detail: String(e?.message ?? e),
        limit: safeLimit,
        lockKey,
        ttlSeconds: safeTtl,
        lockNote: lock.note ?? null,
      },
      { status: 504 },
    );
  } finally {
    clearTimeout(t);
  }
}