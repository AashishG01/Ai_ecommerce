/**
 * Order service — the most complex service in the backend.
 *
 * Key feature: Transactional order creation with inventory reservation
 * to prevent overselling (SELECT ... FOR UPDATE pattern).
 */
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';

const orderSelect = {
    id: true,
    status: true,
    total: true,
    createdAt: true,
    updatedAt: true,
    address: {
        select: { id: true, line1: true, line2: true, city: true, state: true, postalCode: true, country: true },
    },
    items: {
        select: {
            id: true,
            quantity: true,
            unitPrice: true,
            product: {
                select: { id: true, name: true, slug: true, images: true },
            },
        },
    },
    payment: {
        select: { id: true, provider: true, status: true, amount: true, gatewayId: true },
    },
};

/**
 * Create an order from the user's cart.
 *
 * Algorithm:
 *   1. Validate cart is not empty
 *   2. Validate address belongs to user
 *   3. Inside a transaction:
 *      a. Lock inventory rows (SELECT ... FOR UPDATE)
 *      b. Verify stock for each item
 *      c. Reserve inventory (increment reserved, decrement quantity)
 *      d. Create order + order items at current prices
 *      e. Create pending payment record
 *      f. Clear the cart
 *   4. Return the created order
 */
export async function createOrder(userId: string, addressId: string) {
    // 1. Get cart items
    const cartItems = await prisma.cartItem.findMany({
        where: { userId },
        include: {
            product: {
                include: { inventory: true },
            },
        },
    });

    if (cartItems.length === 0) {
        throw new AppError(400, 'Your cart is empty.');
    }

    // 2. Validate address belongs to user
    const address = await prisma.address.findFirst({
        where: { id: addressId, userId },
    });

    if (!address) {
        throw new AppError(404, 'Shipping address not found.');
    }

    // 3. Transactional order creation
    const order = await prisma.$transaction(async (tx: any) => {
        // 3a. Lock inventory rows and verify stock
        for (const item of cartItems) {
            if (!item.product.inventory) {
                throw new AppError(400, `Product "${item.product.name}" has no inventory record.`);
            }

            // Lock the inventory row to prevent concurrent modifications
            // Raw query because Prisma doesn't support SELECT ... FOR UPDATE natively
            const [inventory] = await tx.$queryRaw<Array<{ quantity: number; reserved: number }>>`
                SELECT quantity, reserved FROM inventory
                WHERE product_id = ${item.productId}
                FOR UPDATE
            `;

            const available = inventory.quantity - inventory.reserved;
            if (available < item.quantity) {
                throw new AppError(
                    400,
                    `Insufficient stock for "${item.product.name}". Available: ${available}, Requested: ${item.quantity}.`
                );
            }
        }

        // 3b. Calculate total using current database prices
        const total = cartItems.reduce((sum: number, item: typeof cartItems[number]) => {
            return sum + Number(item.product.price) * item.quantity;
        }, 0);

        // 3c. Create the order
        const newOrder = await tx.order.create({
            data: {
                userId,
                addressId,
                status: 'PENDING',
                total: total.toFixed(2),
                items: {
                    create: cartItems.map((item: typeof cartItems[number]) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.product.price, // Snapshot price at time of purchase
                    })),
                },
                payment: {
                    create: {
                        provider: 'STRIPE',
                        status: 'PENDING',
                        amount: total.toFixed(2),
                    },
                },
            },
            select: orderSelect,
        });

        // 3d. Reserve inventory for each item
        for (const item of cartItems) {
            await tx.inventory.update({
                where: { productId: item.productId },
                data: {
                    reserved: { increment: item.quantity },
                },
            });
        }

        // 3e. Clear the cart
        await tx.cartItem.deleteMany({ where: { userId } });

        logger.info({ orderId: newOrder.id, userId, total }, 'Order created');

        return newOrder;
    });

    return order;
}

/**
 * Get all orders for a user.
 */
export async function getUserOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where: { userId },
            select: orderSelect,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.order.count({ where: { userId } }),
    ]);

    return {
        orders,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

/**
 * Get a single order by ID (must belong to user, or user is admin).
 */
export async function getOrderById(orderId: string, userId: string, isAdmin = false) {
    const where = isAdmin ? { id: orderId } : { id: orderId, userId };

    const order = await prisma.order.findFirst({
        where,
        select: orderSelect,
    });

    if (!order) {
        throw new AppError(404, 'Order not found.');
    }

    return order;
}

/**
 * Update order status (admin only).
 * Handles inventory adjustments on cancellation.
 */
export async function updateOrderStatus(orderId: string, status: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
    });

    if (!order) {
        throw new AppError(404, 'Order not found.');
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
        PENDING: ['PAID', 'CANCELLED'],
        PAID: ['SHIPPED', 'CANCELLED'],
        SHIPPED: ['DELIVERED'],
        DELIVERED: [],       // terminal state
        CANCELLED: [],       // terminal state
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) {
        throw new AppError(
            400,
            `Cannot transition from ${order.status} to ${status}. Allowed: ${allowed.join(', ') || 'none'}.`
        );
    }

    // If cancelling, release reserved inventory
    if (status === 'CANCELLED') {
        await prisma.$transaction(async (tx: any) => {
            for (const item of order.items) {
                await tx.inventory.update({
                    where: { productId: item.productId },
                    data: {
                        reserved: { decrement: item.quantity },
                    },
                });
            }

            await tx.order.update({
                where: { id: orderId },
                data: { status },
            });

            await tx.payment.updateMany({
                where: { orderId },
                data: { status: 'FAILED' },
            });
        });

        logger.info({ orderId, status }, 'Order cancelled, inventory released');
    } else if (status === 'DELIVERED') {
        // On delivery: decrement reserved (items are now truly sold)
        await prisma.$transaction(async (tx: any) => {
            for (const item of order.items) {
                await tx.inventory.update({
                    where: { productId: item.productId },
                    data: {
                        quantity: { decrement: item.quantity },
                        reserved: { decrement: item.quantity },
                    },
                });
            }

            await tx.order.update({
                where: { id: orderId },
                data: { status },
            });
        });

        logger.info({ orderId, status }, 'Order delivered, inventory finalized');
    } else {
        await prisma.order.update({
            where: { id: orderId },
            data: { status: status as any },
        });
    }

    return prisma.order.findUnique({ where: { id: orderId }, select: orderSelect });
}
