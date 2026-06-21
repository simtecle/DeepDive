'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheckIcon } from '@phosphor-icons/react';
import type { ConsentState } from '@/lib/consent';

type Props = {
  consent: ConsentState;
  onChange: (next: ConsentState) => void;
};

export function ConsentBanner({ consent, onChange }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => setVisible(consent.decidedAt === null), [consent.decidedAt]);

  if (!visible) return null;

  return (
    <aside
      className="fixed inset-x-3 bottom-[84px] z-[var(--z-banner)] mx-auto max-w-3xl rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-4 sm:p-5 md:bottom-5"
      aria-label="Analytics consent"
    >
      <div className="flex gap-3">
        <ShieldCheckIcon className="mt-0.5 shrink-0 text-[var(--accent)]" size={22} weight="duotone" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Your analytics preference</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--foreground-secondary)] sm:text-sm">
            Optional analytics help improve DeepDive. You can accept, reject, or change this later in settings.
          </p>
          <Link className="mt-1 inline-block text-xs text-[var(--foreground-secondary)] underline underline-offset-4 hover:text-[var(--foreground)]" href="/privacy">
            Read the Privacy Policy
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 sm:justify-end">
        <button
          onClick={() => {
            onChange({ analytics: false, decidedAt: new Date().toISOString() });
            setVisible(false);
          }}
          className="min-h-11 flex-1 rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)] sm:flex-none"
        >
          Reject
        </button>
        <Link
          href="/settings"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)] sm:flex-none"
        >
          Settings
        </Link>
        <button
          onClick={() => {
            onChange({ analytics: true, decidedAt: new Date().toISOString() });
            setVisible(false);
          }}
          className="min-h-11 flex-1 rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] sm:flex-none"
        >
          Accept
        </button>
      </div>
    </aside>
  );
}
