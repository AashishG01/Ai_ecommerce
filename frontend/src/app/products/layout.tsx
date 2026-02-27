import { Suspense } from 'react';
import Filters from '@/components/filters';

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        <aside className="md:col-span-1">
          <Suspense>
            <Filters />
          </Suspense>
        </aside>
        <main className="md:col-span-3">{children}</main>
      </div>
    </div>
  );
}
