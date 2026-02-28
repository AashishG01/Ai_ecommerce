/**
 * Cart service — business logic for shopping cart.
 * Uses PostgreSQL upsert for add-to-cart (atomic increment).
 */
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { AddToCartInput, UpdateCartItemInput } from './cart.schema';

const cartItemSelect = {
    id: true,
    quantity: true,
    product: {
        select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            originalPrice: true,
            images: true,
            inventory: { select: { quantity: true, reserved: true } },
        },
    },
};

/**
 * Get the user's full cart with product details.
 */
export async function getCart(userId: string) {
    const items = await prisma.cartItem.findMany({
        where: { userId },
        select: cartItemSelect,
        orderBy: { product: { name: 'asc' } },
    });

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: { product: { price: any }; quantity: number }) => {
        return sum + Number(item.product.price) * item.quantity;
    }, 0);

    return {
        items,
        itemCount: items.length,
        totalQuantity: items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0),
        subtotal: Math.round(subtotal * 100) / 100, // round to 2 decimals
    };
}

/**
 * Add a product to cart (or increment quantity if already exists).
 * Uses Prisma upsert — atomic operation, no race conditions.
 */
export async function addToCart(userId: string, input: AddToCartInput) {
    const { productId, quantity } = input;

    // Verify product exists and has stock
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { inventory: true },
    });

    if (!product) {
        throw new AppError(404, 'Product not found.');
    }

    const available = (product.inventory?.quantity ?? 0) - (product.inventory?.reserved ?? 0);
    if (available < quantity) {
        throw new AppError(400, `Only ${available} items available in stock.`);
    }

    // Upsert: create if not exists, increment quantity if exists
    const item = await prisma.cartItem.upsert({
        where: {
            userId_productId: { userId, productId },
        },
        create: {
            userId,
            productId,
            quantity,
        },
        update: {
            quantity: { increment: quantity },
        },
        select: cartItemSelect,
    });

    return item;
}

/**
 * Update the quantity of a specific cart item.
 */
export async function updateCartItem(
    userId: string,
    productId: string,
    input: UpdateCartItemInput
) {
    // Verify the cart item belongs to this user
    const existing = await prisma.cartItem.findUnique({
        where: { userId_productId: { userId, productId } },
    });

    if (!existing) {
        throw new AppError(404, 'Item not in your cart.');
    }

    // Check stock availability
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { inventory: true },
    });

    const available = (product?.inventory?.quantity ?? 0) - (product?.inventory?.reserved ?? 0);
    if (available < input.quantity) {
        throw new AppError(400, `Only ${available} items available in stock.`);
    }

    const item = await prisma.cartItem.update({
        where: { userId_productId: { userId, productId } },
        data: { quantity: input.quantity },
        select: cartItemSelect,
    });

    return item;
}

/**
 * Remove a product from cart.
 */
export async function removeFromCart(userId: string, productId: string) {
    const existing = await prisma.cartItem.findUnique({
        where: { userId_productId: { userId, productId } },
    });

    if (!existing) {
        throw new AppError(404, 'Item not in your cart.');
    }

    await prisma.cartItem.delete({
        where: { userId_productId: { userId, productId } },
    });
}

/**
 * Clear the entire cart for a user.
 */
export async function clearCart(userId: string) {
    await prisma.cartItem.deleteMany({ where: { userId } });
}
