/**
 * Zod schemas for wishlist input validation.
 */
import { z } from 'zod';

export const wishlistItemSchema = z.object({
    productId: z.string().uuid('Invalid product ID'),
});

export type WishlistItemInput = z.infer<typeof wishlistItemSchema>;
