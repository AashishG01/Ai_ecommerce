import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  getProductBySlug,
  getRelatedProducts,
  getReviewsForProduct,
  allProducts
} from '@/lib/mock-data';
import ProductCard from '@/components/product-card';
import StarRating from '@/components/star-rating';
import ProductView from '@/components/product-view';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return allProducts.map(product => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }
  return {
    title: `${product.name} | EStoreFront`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = getRelatedProducts(product.id, product.category.id);
  const reviews = getReviewsForProduct(product.id);

  return (
    <div className="container py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <ProductView product={product} />

        <div>
          <h1 className="font-headline text-3xl font-bold md:text-4xl">{product.name}</h1>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-1">
              <StarRating rating={product.rating} />
              <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-medium text-green-600">
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
            </span>
          </div>
          <p className="mt-6 text-muted-foreground">{product.description}</p>
        </div>
      </div>

      <Separator className="my-12" />

      <div>
        <h2 className="font-headline text-2xl font-bold">Customer Reviews</h2>
        <div className="mt-6 space-y-6">
          {reviews.map(review => (
            <div key={review.id} className="flex gap-4">
              <Avatar>
                <AvatarImage src={review.avatar} alt={review.author} />
                <AvatarFallback>{review.author.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{review.author}</p>
                  <span className="text-sm text-muted-foreground">{review.date}</span>
                </div>
                <StarRating rating={review.rating} className="my-1" />
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-12" />

      <div>
        <h2 className="font-headline text-2xl font-bold">You Might Also Like</h2>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {relatedProducts.map(relatedProduct => (
            <ProductCard key={relatedProduct.id} product={relatedProduct} />
          ))}
        </div>
      </div>
    </div>
  );
}
