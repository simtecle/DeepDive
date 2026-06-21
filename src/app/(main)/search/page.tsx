import { Suspense } from 'react';
import SearchPageClient from './SearchPageClient';

export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="dd-skeleton h-44 rounded-[14px]" aria-label="Loading search" />}>
      <SearchPageClient />
    </Suspense>
  );
}
