/**
 * Zod schemas for address validation.
 */
import { z } from 'zod';

export const createAddressSchema = z.object({
    line1: z.string().min(1, 'Address line 1 is required').max(255).trim(),
    line2: z.string().max(255).trim().optional(),
    city: z.string().min(1, 'City is required').max(100).trim(),
    state: z.string().min(1, 'State is required').max(100).trim(),
    postalCode: z.string().min(1, 'Postal code is required').max(20).trim(),
    country: z.string().max(100).trim().default('India'),
    isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
