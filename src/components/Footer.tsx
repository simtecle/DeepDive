'use client';

import Link from 'next/link';
import { clearConsent } from '@/lib/consent';

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 px-4 pb-24 pt-6 text-xs text-[var(--foreground-muted)] sm:px-6 md:flex-row md:items-center md:justify-between md:gap-6 md:px-10 md:pb-6">
        <span>© {new Date().getFullYear()} DeepDive</span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link className="transition-colors hover:text-[var(--foreground)]" href="/impressum">Impressum</Link>
          <Link className="transition-colors hover:text-[var(--foreground)]" href="/privacy">Privacy</Link>
          <button
            className="min-h-11 transition-colors hover:text-[var(--foreground)]"
            onClick={() => {
              clearConsent();
              window.location.reload();
            }}
          >
            Cookie settings
          </button>
        </div>
      </div>
    </footer>
  );
}
