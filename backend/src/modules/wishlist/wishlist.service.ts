/**
 * Wishlist service — business logic for user wishlists.
 */
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

const wishlistSelect = {
    id: true,
    product: {
        select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            originalPrice: true,
            images: true,
            rating: true,
            reviewCount: true,
            isTrending: true,
            inventory: { select: { quantity: true, reserved: true } },
        },
    },
};

/**
 * Get all wishlist items for a user.
 */
export async function getWishlist(userId: string) {
    const items = await prisma.wishlistItem.findMany({
        where: { userId },
        select: wishlistSelect,
        orderBy: { product: { name: 'asc' } },
    });

    return { items, count: items.length };
}

/**
 * Add a product to the wishlist.
 * Returns existing if already wishlisted (idempotent).
 */
export async function addToWishlist(userId: string, productId: string) {
    // Verify product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
        throw new AppError(404, 'Product not found.');
    }

    // Check if already in wishlist
    const existing = await prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId, productId } },
        select: wishlistSelect,
    });

    if (existing) {
        return existing; // Idempotent — no error, just return existing
    }

    const item = await prisma.wishlistItem.create({
        data: { userId, productId },
        select: wishlistSelect,
    });

    return item;
}

/**
 * Remove a product from the wishlist.
 */
export async function removeFromWishlist(userId: string, productId: string) {
    const existing = await prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId, productId } },
    });

    if (!existing) {
        throw new AppError(404, 'Item not in your wishlist.');
    }

    await prisma.wishlistItem.delete({
        where: { userId_productId: { userId, productId } },
    });
}

/**
 * Check if a product is in the user's wishlist.
 */
export async function isInWishlist(userId: string, productId: string): Promise<boolean> {
    const item = await prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId, productId } },
    });
    return !!item;
}

/**
 * Move a wishlist item to the cart (remove from wishlist + add to cart).
 */
export async function moveToCart(userId: string, productId: string) {
    const existing = await prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId, productId } },
    });

    if (!existing) {
        throw new AppError(404, 'Item not in your wishlist.');
    }

    // Check stock
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { inventory: true },
    });

    const available = (product?.inventory?.quantity ?? 0) - (product?.inventory?.reserved ?? 0);
    if (available < 1) {
        throw new AppError(400, 'Product is out of stock.');
    }

    // Transaction: remove from wishlist + add to cart atomically
    await prisma.$transaction([
        prisma.wishlistItem.delete({
            where: { userId_productId: { userId, productId } },
        }),
        prisma.cartItem.upsert({
            where: { userId_productId: { userId, productId } },
            create: { userId, productId, quantity: 1 },
            update: { quantity: { increment: 1 } },
        }),
    ]);
}

/**
 * Clear the entire wishlist for a user.
 */
export async function clearWishlist(userId: string) {
    await prisma.wishlistItem.deleteMany({ where: { userId } });
}
