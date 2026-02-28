/**
 * Address service — CRUD for user shipping addresses.
 */
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CreateAddressInput, UpdateAddressInput } from './addresses.schema';

/**
 * Get all addresses for a user.
 */
export async function getAddresses(userId: string) {
    return prisma.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { city: 'asc' }],
    });
}

/**
 * Create a new address.
 * If marked as default, unsets other defaults.
 */
export async function createAddress(userId: string, input: CreateAddressInput) {
    if (input.isDefault) {
        await prisma.address.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
        });
    }

    return prisma.address.create({
        data: { ...input, userId },
    });
}

/**
 * Update an address.
 */
export async function updateAddress(userId: string, addressId: string, input: UpdateAddressInput) {
    const address = await prisma.address.findFirst({
        where: { id: addressId, userId },
    });

    if (!address) {
        throw new AppError(404, 'Address not found.');
    }

    if (input.isDefault) {
        await prisma.address.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
        });
    }

    return prisma.address.update({
        where: { id: addressId },
        data: input,
    });
}

/**
 * Delete an address.
 */
export async function deleteAddress(userId: string, addressId: string) {
    const address = await prisma.address.findFirst({
        where: { id: addressId, userId },
    });

    if (!address) {
        throw new AppError(404, 'Address not found.');
    }

    await prisma.address.delete({ where: { id: addressId } });
}
