/**
 * Zod schemas for cart input validation.
 */
import { z } from 'zod';

export const addToCartSchema = z.object({
    productId: z.string().uuid('Invalid product ID'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Max 50 per item').default(1),
});

export const updateCartItemSchema = z.object({
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Max 50 per item'),
});

export const cartItemParamSchema = z.object({
    productId: z.string().uuid('Invalid product ID'),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
