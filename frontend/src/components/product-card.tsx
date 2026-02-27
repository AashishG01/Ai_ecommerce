"use client"

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useStore } from '@/hooks/use-store';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import StarRating from './star-rating';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist } = useStore();
  const inWishlist = isInWishlist(product.id);

  return (
    <Card className="group flex h-full flex-col overflow-hidden">
      <CardHeader className="relative p-0">
        <Link href={`/products/${product.slug}`}>
          <div className="aspect-[3/4] overflow-hidden">
            <Image
              src={product.images[0]}
              alt={product.name}
              width={600}
              height={800}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </Link>
        {product.originalPrice && (
          <div className="absolute left-3 top-3 rounded-full bg-destructive px-2 py-1 text-xs text-destructive-foreground">
            SALE
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <CardTitle className="mb-1 text-base font-medium leading-tight">
          <Link href={`/products/${product.slug}`} className="hover:text-primary">
            {product.name}
          </Link>
        </CardTitle>
        <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
                {product.originalPrice && (
                <span className="text-sm text-muted-foreground line-through">
                    ${product.originalPrice.toFixed(2)}
                </span>
                )}
            </div>
            <p className="text-xs text-muted-foreground">{product.category.name}</p>
        </div>
        <div className="flex items-center gap-1">
          <StarRating rating={product.rating} />
          <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 p-4 pt-0">
        <Button size="sm" className="w-full" onClick={() => addToCart(product)}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toggleWishlist(product.id)}
          aria-label="Add to wishlist"
        >
          <Heart
            className={cn('h-4 w-4', inWishlist && 'fill-destructive text-destructive')}
          />
        </Button>
      </CardFooter>
    </Card>
  );
}
