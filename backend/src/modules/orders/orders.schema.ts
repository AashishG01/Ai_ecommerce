/**
 * Zod schemas for order validation.
 */
import { z } from 'zod';

export const createOrderSchema = z.object({
    addressId: z.string().uuid('Invalid address ID'),
});

export const orderIdParamSchema = z.object({
    orderId: z.string().uuid('Invalid order ID'),
});

export const updateOrderStatusSchema = z.object({
    status: z.enum(['PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'], {
        errorMap: () => ({ message: 'Status must be PAID, SHIPPED, DELIVERED, or CANCELLED' }),
    }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
