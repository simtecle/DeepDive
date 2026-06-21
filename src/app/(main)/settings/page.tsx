'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { clearConsent, getConsent, setConsent, type ConsentState } from '@/lib/consent';
import { CheckCircleIcon, ShieldCheckIcon } from '@phosphor-icons/react';

function fmt(ts?: string | null) {
  if (!ts) return 'not set';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function SettingsPage() {
  const [consent, setConsentState] = useState<ConsentState | null>(null);
  const analyticsEnabled = useMemo(() => consent?.analytics === true, [consent]);

  useEffect(() => {
    setConsentState(getConsent());
  }, []);

  function accept() {
    const next: ConsentState = { analytics: true, decidedAt: new Date().toISOString() };
    setConsent(next);
    setConsentState(next);
    // No reload: AnalyticsGate sollte auf consent reagieren.
  }

  function reject() {
    const next: ConsentState = { analytics: false, decidedAt: new Date().toISOString() };
    setConsent(next);
    setConsentState(next);
  }

  function reset() {
    clearConsent();
    setConsentState(null);
  }

  return (
    <main className="space-y-8">
      <header className="max-w-2xl">
        <ShieldCheckIcon size={30} weight="duotone" className="mb-5 text-[var(--accent)]" aria-hidden="true" />
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)] sm:text-base">
          Manage privacy and analytics preferences.
        </p>
      </header>

      <section className="max-w-3xl overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] p-5 sm:p-6">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">Privacy &amp; Analytics</h2>
          <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
            Analytics are only enabled after you opt in.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-sm font-medium">Current status</p>
            <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">Last updated {fmt(consent?.decidedAt)}</p>
          </div>
          <span className={[
            'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
            analyticsEnabled
              ? 'bg-[color-mix(in_oklch,var(--success)_15%,transparent)] text-[var(--success)]'
              : 'bg-[var(--background-subtle)] text-[var(--foreground-secondary)]',
          ].join(' ')}>
            {analyticsEnabled && <CheckCircleIcon size={15} weight="fill" aria-hidden="true" />}
            {consent === null ? 'No choice yet' : analyticsEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 p-5 sm:p-6">
          <button
            onClick={accept}
            className="min-h-11 rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] active:translate-y-px"
          >
            Accept analytics
          </button>
          <button
            onClick={reject}
            className="min-h-11 rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)] active:translate-y-px"
          >
            Reject analytics
          </button>
          <button
            onClick={reset}
            className="min-h-11 rounded-[10px] px-4 text-sm font-semibold text-[var(--foreground-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)] active:translate-y-px"
          >
            Reset choice
          </button>
        </div>

        <p className="px-5 pb-5 text-xs leading-5 text-[var(--foreground-muted)] sm:px-6 sm:pb-6">
          See details in our{' '}
          <Link className="text-[var(--foreground-secondary)] underline underline-offset-4 hover:text-[var(--foreground)]" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
