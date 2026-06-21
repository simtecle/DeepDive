import { MagnifyingGlassIcon } from '@phosphor-icons/react';

type Props = {
  search: string;
  language: string;
  level: string;
  onSearchChange: (v: string) => void;
  onLanguageChange: (v: string) => void;
  onLevelChange: (v: string) => void;
  onSubmit: () => void;
};

export function SearchBar({
  search,
  language,
  level,
  onSearchChange,
  onLanguageChange,
  onLevelChange,
  onSubmit,
}: Props) {
  return (
    <form
      className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="grid gap-1.5 text-xs font-medium text-[var(--foreground-secondary)]">
        Topic
        <input
          className="min-h-11 min-w-0 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] transition-colors hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none"
          placeholder="Search a topic"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-medium text-[var(--foreground-secondary)]">
        Language
        <select
          className="min-h-11 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] transition-colors hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none"
          value={language}
          onChange={(event) => onLanguageChange(event.target.value)}
        >
          <option value="">All languages</option>
          <option value="en">English</option>
          <option value="de">German</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-medium text-[var(--foreground-secondary)]">
        Level
        <select
          className="min-h-11 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] transition-colors hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none"
          value={level}
          onChange={(event) => onLevelChange(event.target.value)}
        >
          <option value="">All levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={search.trim().length < 2}
        className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
      >
        <MagnifyingGlassIcon size={17} weight="bold" aria-hidden="true" />
        Search
      </button>
    </form>
  );
}
