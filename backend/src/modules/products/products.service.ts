/**
 * Product service — business logic layer.
 * Handles database queries via Prisma.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ProductQuery } from './products.schema';
import { AppError } from '../../middleware/errorHandler';

// Fields to select (exclude internal fields)
const productSelect = {
    id: true,
    name: true,
    slug: true,
    description: true,
    price: true,
    originalPrice: true,
    images: true,
    rating: true,
    reviewCount: true,
    isTrending: true,
    createdAt: true,
    category: { select: { id: true, name: true, slug: true } },
    brand: { select: { id: true, name: true, slug: true } },
    inventory: { select: { quantity: true, reserved: true } },
} satisfies Prisma.ProductSelect;

/**
 * List products with pagination, filters, search, and sorting.
 */
export async function listProducts(query: ProductQuery) {
    const { category, brand, minPrice, maxPrice, trending, sort, search, page, limit } = query;

    // Build WHERE clause
    const where: Prisma.ProductWhereInput = {};

    if (category) {
        where.category = { slug: { equals: category, mode: 'insensitive' } };
    }
    if (brand) {
        where.brand = { slug: { equals: brand, mode: 'insensitive' } };
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = minPrice;
        if (maxPrice !== undefined) where.price.lte = maxPrice;
    }
    if (trending) {
        where.isTrending = true;
    }
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ];
    }

    // Build ORDER BY
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };
    else if (sort === 'rating') orderBy = { rating: 'desc' };
    else if (sort === 'name') orderBy = { name: 'asc' };
    else if (sort === 'newest') orderBy = { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            select: productSelect,
            orderBy,
            skip,
            take: limit,
        }),
        prisma.product.count({ where }),
    ]);

    return {
        data: products,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

/**
 * Get a single product by slug.
 */
export async function getProductBySlug(slug: string) {
    const product = await prisma.product.findUnique({
        where: { slug },
        select: productSelect,
    });

    if (!product) {
        throw new AppError(404, 'Product not found');
    }

    return product;
}

/**
 * Get all categories.
 */
export async function getCategories() {
    return prisma.category.findMany({
        orderBy: { name: 'asc' },
    });
}

/**
 * Get all brands.
 */
export async function getBrands() {
    return prisma.brand.findMany({
        orderBy: { name: 'asc' },
    });
}

/**
 * Get reviews for a product.
 */
export async function getProductReviews(productId: string) {
    return prisma.review.findMany({
        where: { productId },
        include: {
            user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}
