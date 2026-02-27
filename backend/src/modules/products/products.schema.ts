/**
 * Zod schemas for product query validation.
 */
import { z } from 'zod';

export const productQuerySchema = z.object({
    category: z.string().optional(),
    brand: z.string().optional(),
    minPrice: z
        .string()
        .optional()
        .transform((val) => (val ? parseFloat(val) : undefined))
        .pipe(z.number().positive().optional()),
    maxPrice: z
        .string()
        .optional()
        .transform((val) => (val ? parseFloat(val) : undefined))
        .pipe(z.number().positive().optional()),
    trending: z
        .string()
        .optional()
        .transform((val) => val === 'true'),
    sort: z.enum(['price_asc', 'price_desc', 'rating', 'name', 'newest']).optional(),
    search: z.string().max(200).optional(),
    page: z
        .string()
        .optional()
        .default('1')
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().int().positive()),
    limit: z
        .string()
        .optional()
        .default('20')
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().int().min(1).max(100)),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
