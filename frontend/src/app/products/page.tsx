
import { Suspense } from 'react';
import ProductGrid from '@/components/product-grid';
import { allProducts } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'All Products | EStoreFront',
  description: 'Browse our collection of high-quality products.',
};

function ProductGridSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(9)].map((_, i) => (
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

export default function ProductsPage() {
  const products = allProducts; // In a real app, this would be an API call

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-headline text-4xl font-bold">All Products</h1>
        <p className="mt-2 text-muted-foreground">
          Discover your next favorite item from our curated collection.
        </p>
      </div>
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid products={products} />
      </Suspense>
    </div>
  );
}
