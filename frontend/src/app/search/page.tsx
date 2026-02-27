import { Suspense } from 'react';
import ProductGrid from '@/components/product-grid';
import { allProducts } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Search Results | EStoreFront',
};

function ProductGridSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-4 rounded-lg border p-4">
                    <Skeleton className="aspect-[3/4] w-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                    <Skeleton className="h-9 w-full" />
                </div>
            ))}
        </div>
    )
}

function SearchResults({ query }: { query: string }) {
  const products = allProducts.filter(product =>
    product.name.toLowerCase().includes(query.toLowerCase()) ||
    product.description.toLowerCase().includes(query.toLowerCase()) ||
    product.category.name.toLowerCase().includes(query.toLowerCase()) ||
    product.brand.name.toLowerCase().includes(query.toLowerCase())
  );

  return <ProductGrid products={products} />;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || '';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-headline text-4xl font-bold">Search Results</h1>
        {query && (
          <p className="mt-2 text-muted-foreground">
            Showing results for: <span className="font-semibold text-foreground">&quot;{query}&quot;</span>
          </p>
        )}
      </div>
      <Suspense fallback={<ProductGridSkeleton />}>
        <SearchResults query={query} />
      </Suspense>
    </div>
  );
}
