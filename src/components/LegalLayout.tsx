import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';

export function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex min-h-11 items-center gap-2.5 font-semibold tracking-[-0.02em]">
            <span className="grid size-8 place-items-center rounded-[9px] bg-[var(--accent)] text-sm font-bold text-[var(--accent-ink)]">D</span>
            DeepDive
          </Link>
          <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)]" href="/">
            <ArrowLeftIcon size={17} weight="bold" aria-hidden="true" />
            Back to app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <article className="legal-copy">{children}</article>
      </main>
      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-4xl flex-wrap gap-x-5 gap-y-2 px-5 py-6 text-xs text-[var(--foreground-muted)] sm:px-8">
          <Link href="/privacy" className="hover:text-[var(--foreground)]">Privacy</Link>
          <Link href="/datenschutz" className="hover:text-[var(--foreground)]">Datenschutz</Link>
          <Link href="/impressum" className="hover:text-[var(--foreground)]">Impressum</Link>
        </div>
      </footer>
    </div>
  );
}
