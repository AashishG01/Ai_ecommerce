
'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useStore } from '@/hooks/use-store';
import { allProducts } from '@/lib/mock-data';
import ProductCard from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function WishlistPage() {
  const { wishlist } = useStore();

  const wishlistProducts = allProducts.filter(p => wishlist.includes(p.id));

  return (
      <Card>
          <CardHeader>
              <CardTitle className="font-headline text-2xl">My Wishlist</CardTitle>
              <CardDescription>Your saved items for future purchases.</CardDescription>
          </CardHeader>
          <CardContent>
            {wishlistProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                    <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">Your Wishlist is Empty</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Explore our products and save your favorites to view them here later.
                    </p>
                    <Button asChild className="mt-6">
                        <Link href="/products">Discover Products</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {wishlistProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
          </CardContent>
      </Card>
  )
}
