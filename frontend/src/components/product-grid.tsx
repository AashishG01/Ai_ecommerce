'use client';

import { useSearchParams } from 'next/navigation';
import type { Product } from '@/lib/types';
import ProductCard from './product-card';

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  const searchParams = useSearchParams();

  const category = searchParams.get('category');
  const brand = searchParams.get('brand');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const sort = searchParams.get('sort') || 'trending';

  const filteredProducts = products
    .filter(product => {
      if (category && product.category.slug !== category) return false;
      if (brand && product.brand.slug !== brand) return false;
      if (minPrice && product.price < Number(minPrice)) return false;
      if (maxPrice && product.price > Number(maxPrice)) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'trending':
          return (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0);
        case 'rating':
            return b.rating - a.rating;
        default:
          return 0;
      }
    });

  if (filteredProducts.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center">
        <h2 className="font-headline text-2xl font-semibold">No products found</h2>
        <p className="mt-2 text-muted-foreground">
          Try adjusting your filters to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {filteredProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
