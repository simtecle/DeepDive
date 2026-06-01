

import { NextRequest, NextResponse } from 'next/server';

function isAuthorized(req: NextRequest) {
  const expected = process.env.CRON_SECRET ?? '';
  const auth = req.headers.get('authorization') ?? '';
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';

  // Allow scheduled Vercel cron OR manual bearer auth.
  if (isVercelCron) return true;
  if (!expected) return false;
  return auth === `Bearer ${expected}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
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
      return NextResponse.json({ ok: true, upstreamStatus: res.status, limit: safeLimit, result: json });
    } catch {
      return NextResponse.json({ ok: true, upstreamStatus: res.status, limit: safeLimit, resultText: text });
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'timeout_or_fetch_failed', detail: String(e?.message ?? e), limit: safeLimit },
      { status: 504 },
    );
  } finally {
    clearTimeout(t);
  }
}