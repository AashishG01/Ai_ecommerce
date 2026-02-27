
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MessageSquare, Edit, Trash2 } from 'lucide-react';
import StarRating from '@/components/star-rating';
import { Button } from '@/components/ui/button';
import { allProducts } from '@/lib/mock-data';
import Image from 'next/image';

const reviews = [
  { id: '1', productId: '1', rating: 5, date: '2023-05-20', comment: 'Absolutely love this backpack! It\'s stylish, spacious, and very comfortable to wear.' },
  { id: '2', productId: '4', rating: 4, date: '2023-08-10', comment: 'Great running shoes, very light. Could have a bit more cushion.' },
  { id: '3', productId: '6', rating: 5, date: '2023-09-01', comment: 'Makes the best coffee, hands down. Easy to clean too.' },
];

export default function MyReviewsPage() {
  const reviewsWithProducts = reviews.map(review => {
    const product = allProducts.find(p => p.id === review.productId);
    return { ...review, product };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">My Reviews & Ratings</CardTitle>
        <CardDescription>A list of all the reviews you have submitted.</CardDescription>
      </CardHeader>
      <CardContent>
        {reviewsWithProducts.length > 0 ? (
          <div className="space-y-6">
            {reviewsWithProducts.map(review => (
              <div key={review.id} className="rounded-lg border p-4">
                {review.product && (
                  <div className="flex items-start gap-4">
                     <Image src={review.product.images[0]} alt={review.product.name} width={80} height={80} className="rounded-md object-cover" />
                    <div className="w-full">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">{review.product.name}</h3>
                            <span className="text-sm text-muted-foreground">{review.date}</span>
                        </div>
                        <StarRating rating={review.rating} className="my-2" />
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button variant="ghost" size="sm"><Edit className="mr-2 h-4 w-4"/>Edit</Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</Button>
                        </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">No Reviews Yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You haven't reviewed any products. Share your thoughts after you make a purchase!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
