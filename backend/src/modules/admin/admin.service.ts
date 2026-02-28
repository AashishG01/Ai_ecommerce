/**
 * Admin service — dashboard stats + management operations.
 * All functions assume caller is already authorized as ADMIN.
 */
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

// ─── Dashboard Stats ───────────────────────────────────────

/**
 * Get dashboard overview: total users, products, orders, revenue.
 */
export async function getDashboardStats() {
    const [
        totalUsers,
        totalProducts,
        totalOrders,
        revenueResult,
        pendingOrders,
        lowStockProducts,
        recentOrders,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.product.count(),
        prisma.order.count(),
        prisma.order.aggregate({
            where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
            _sum: { total: true },
        }),
        prisma.order.count({ where: { status: 'PENDING' } }),
        prisma.product.count({
            where: {
                inventory: {
                    quantity: { lte: 10 },
                },
            },
        }),
        prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                status: true,
                total: true,
                createdAt: true,
                user: { select: { id: true, name: true, email: true } },
            },
        }),
    ]);

    return {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: revenueResult._sum.total ?? 0,
        pendingOrders,
        lowStockProducts,
        recentOrders,
    };
}

// ─── Product Management ────────────────────────────────────

/**
 * Create a new product.
 */
export async function createProduct(data: {
    name: string;
    slug: string;
    description: string;
    price: number;
    originalPrice?: number;
    images: string[];
    categoryId: string;
    brandId: string;
    isTrending?: boolean;
    quantity?: number;
}) {
    const { quantity = 0, ...productData } = data;

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({ where: { slug: productData.slug } });
    if (existing) {
        throw new AppError(409, 'A product with this slug already exists.');
    }

    const product = await prisma.product.create({
        data: {
            ...productData,
            price: productData.price,
            originalPrice: productData.originalPrice,
            inventory: {
                create: { quantity, reserved: 0 },
            },
        },
        include: {
            category: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } },
            inventory: true,
        },
    });

    return product;
}

/**
 * Update a product.
 */
export async function updateProduct(productId: string, data: Record<string, any>) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
        throw new AppError(404, 'Product not found.');
    }

    // Separate inventory data from product data
    const { quantity, ...productData } = data;

    const updated = await prisma.product.update({
        where: { id: productId },
        data: productData,
        include: {
            category: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } },
            inventory: true,
        },
    });

    // Update inventory separately if quantity is provided
    if (quantity !== undefined) {
        await prisma.inventory.upsert({
            where: { productId },
            create: { productId, quantity, reserved: 0 },
            update: { quantity },
        });
    }

    return updated;
}

/**
 * Delete a product (soft-check: can't delete if has pending orders).
 */
export async function deleteProduct(productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
        throw new AppError(404, 'Product not found.');
    }

    // Check for pending orders containing this product
    const pendingOrderItems = await prisma.orderItem.count({
        where: {
            productId,
            order: { status: { in: ['PENDING', 'PAID'] } },
        },
    });

    if (pendingOrderItems > 0) {
        throw new AppError(
            400,
            `Cannot delete: ${pendingOrderItems} pending/paid orders contain this product.`
        );
    }

    // Delete related records first, then the product
    await prisma.$transaction([
        prisma.cartItem.deleteMany({ where: { productId } }),
        prisma.wishlistItem.deleteMany({ where: { productId } }),
        prisma.review.deleteMany({ where: { productId } }),
        prisma.inventory.deleteMany({ where: { productId } }),
        prisma.product.delete({ where: { id: productId } }),
    ]);
}

// ─── Inventory Management ──────────────────────────────────

/**
 * Get low-stock products (quantity ≤ threshold).
 */
export async function getLowStockProducts(threshold = 10) {
    return prisma.product.findMany({
        where: {
            inventory: { quantity: { lte: threshold } },
        },
        select: {
            id: true,
            name: true,
            slug: true,
            inventory: { select: { quantity: true, reserved: true } },
        },
        orderBy: { inventory: { quantity: 'asc' } },
    });
}

/**
 * Bulk update inventory (e.g., after warehouse restock).
 */
export async function bulkUpdateInventory(
    updates: Array<{ productId: string; quantity: number }>
) {
    const results = await prisma.$transaction(
        updates.map((u) =>
            prisma.inventory.update({
                where: { productId: u.productId },
                data: { quantity: u.quantity },
            })
        )
    );

    return results;
}

// ─── User Management ───────────────────────────────────────

/**
 * List all users (paginated) with order counts.
 */
export async function listUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                _count: { select: { orders: true, reviews: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.user.count(),
    ]);

    return {
        users,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
}

/**
 * Update a user's role (promote to admin or demote to customer).
 */
export async function updateUserRole(userId: string, role: 'ADMIN' | 'CUSTOMER') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new AppError(404, 'User not found.');
    }

    return prisma.user.update({
        where: { id: userId },
        data: { role },
        select: { id: true, email: true, name: true, role: true },
    });
}

// ─── Order Management ──────────────────────────────────────

/**
 * List all orders (admin view, paginated) with optional status filter.
 */
export async function listAllOrders(
    page = 1,
    limit = 20,
    status?: string
) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where,
            select: {
                id: true,
                status: true,
                total: true,
                createdAt: true,
                user: { select: { id: true, name: true, email: true } },
                _count: { select: { items: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.order.count({ where }),
    ]);

    return {
        orders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
}
