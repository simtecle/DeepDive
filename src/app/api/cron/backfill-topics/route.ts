import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

function requireCron(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  const expected = (process.env.CRON_SECRET ?? '').trim();

  const bearerOk = Boolean(expected && token && token === expected);

  // Scheduled Vercel cron markers. (Not cryptographic, so we also enforce conservative limits + DB locks.)
  const ua = (req.headers.get('user-agent') ?? '').toLowerCase();
  const scheduledOk = req.headers.has('x-vercel-cron') || ua.includes('vercel-cron/');

  return bearerOk || scheduledOk;
}

export async function GET(req: NextRequest) {
  if (!requireCron(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const adminToken = process.env.ADMIN_TOKEN ?? '';
  if (!adminToken) {
    return NextResponse.json({ ok: false, error: 'missing_admin_token' }, { status: 500 });
  }

  // DB-backed cooldown lock (prevents overlapping / repeated runs).
  // For weekly schedule, a 2h lock is sufficient; override via env.
  const lockKey = 'cron:backfill-topics';
  const ttlSecondsRaw = Number(process.env.BACKFILL_LOCK_TTL_SECONDS ?? process.env.CRON_LOCK_TTL_SECONDS ?? '7200');
  const ttlSeconds = Number.isFinite(ttlSecondsRaw) ? Math.max(60, Math.floor(ttlSecondsRaw)) : 7200;

  // Try to acquire lock using whichever RPC exists. Fail-open if RPC is missing/misconfigured.
  let acquired = true;
  try {
    const { data, error } = await supabaseServer.rpc('acquire_cron_lock', {
      p_job_name: lockKey,
      p_ttl_seconds: ttlSeconds,
      p_locked_by: req.headers.get('x-vercel-id') ?? req.headers.get('user-agent') ?? null,
    });
    if (!error) acquired = Boolean(data);
    else {
      const fb = await supabaseServer.rpc('try_acquire_cron_lock', {
        p_key: lockKey,
        p_ttl_seconds: ttlSeconds,
      });
      if (!fb.error) acquired = Boolean(fb.data);
    }
  } catch {
    acquired = true;
  }

  if (!acquired) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'lock_active', lockKey, ttlSeconds }, { status: 200 });
  }

  // Run daily with conservative defaults.
  // Backfill endpoint itself will stop early on backpressure or pending user requests.
  const body = {
    maxTopics: 2,
    maxPerQuery: 20,
    classifyLimit: 60,
    language: 'en',
    // Targets can be overridden later via env or by calling the admin endpoint directly.
    targets: { beginner: 6, intermediate: 4, advanced: 2 },
    force: false,
  };

  const origin = new URL(req.url).origin;
  const url = `${origin}/api/admin/backfill-topics`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-token': adminToken,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  // Pass-through JSON if possible, otherwise return raw text.
  try {
    const json = JSON.parse(text);
    return NextResponse.json({ ok: true, upstreamStatus: res.status, result: json });
  } catch {
    return NextResponse.json({ ok: true, upstreamStatus: res.status, resultText: text });
  }
}