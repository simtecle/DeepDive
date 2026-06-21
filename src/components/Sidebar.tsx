'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CompassIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  SlidersHorizontalIcon,
} from '@phosphor-icons/react';

const items = [
  { href: '/', label: 'Home', icon: HouseIcon },
  { href: '/search', label: 'Search', icon: MagnifyingGlassIcon },
  { href: '/popular', label: 'Popular', icon: CompassIcon },
  { href: '/settings', label: 'Settings', icon: SlidersHorizontalIcon },
] as const;

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname() || '/';

  return (
    <>
      <aside
        className="fixed inset-y-0 left-0 z-[var(--z-nav)] hidden w-[216px] border-r border-[var(--border)] bg-[var(--background-subtle)] px-4 py-5 md:flex md:flex-col"
        aria-label="Primary navigation"
      >
        <Link href="/" className="flex min-h-11 items-center gap-3 rounded-[10px] px-2">
          <span className="grid size-9 place-items-center rounded-[10px] bg-[var(--accent)] text-sm font-bold text-[var(--accent-ink)]">
            D
          </span>
          <span>
            <span className="block text-[15px] font-semibold tracking-[-0.02em]">DeepDive</span>
            <span className="block text-xs text-[var(--foreground-muted)]">Learning paths</span>
          </span>
        </Link>

        <nav className="mt-10 flex flex-col gap-1.5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors duration-200',
                  active
                    ? 'bg-[var(--surface-raised)] text-[var(--foreground)]'
                    : 'text-[var(--foreground-secondary)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]',
                ].join(' ')}
              >
                <Icon
                  size={20}
                  weight={active ? 'fill' : 'regular'}
                  className={active ? 'text-[var(--accent)]' : undefined}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <p className="mt-auto px-3 text-xs leading-5 text-[var(--foreground-muted)]">
          Curated YouTube paths from first principles to deeper study.
        </p>
      </aside>

      <header className="sticky top-0 z-[var(--z-nav)] flex h-14 items-center border-b border-[var(--border)] bg-[var(--background)] px-4 md:hidden">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 font-semibold tracking-[-0.02em]">
          <span className="grid size-8 place-items-center rounded-[9px] bg-[var(--accent)] text-sm font-bold text-[var(--accent-ink)]">D</span>
          DeepDive
        </Link>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] grid h-[72px] grid-cols-4 border-t border-[var(--border)] bg-[var(--background-subtle)] px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Primary navigation"
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex min-h-11 flex-col items-center justify-center gap-1 rounded-[10px] text-[11px] font-medium transition-colors duration-200',
                active ? 'text-[var(--accent)]' : 'text-[var(--foreground-secondary)]',
              ].join(' ')}
            >
              <Icon size={21} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
