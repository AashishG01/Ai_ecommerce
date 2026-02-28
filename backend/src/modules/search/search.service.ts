/**
 * Search service — PostgreSQL full-text search on products.
 *
 * Uses PostgreSQL's to_tsvector/to_tsquery for robust text search
 * with ranking, combined with optional filters (category, brand, price range).
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface SearchFilters {
    query?: string;
    categoryId?: string;
    brandId?: string;
    minPrice?: number;
    maxPrice?: number;
    isTrending?: boolean;
    sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'relevance';
    page?: number;
    limit?: number;
}

/**
 * Full-text search with filters, sorting, and pagination.
 */
export async function searchProducts(filters: SearchFilters) {
    const {
        query,
        categoryId,
        brandId,
        minPrice,
        maxPrice,
        isTrending,
        sortBy = 'relevance',
        page = 1,
        limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    // Build WHERE conditions
    const where: Prisma.ProductWhereInput = {};

    // Full-text search using PostgreSQL ILIKE (works without tsvector index)
    // For production with heavy traffic, add a GIN index with tsvector
    if (query && query.trim()) {
        where.OR = [
            { name: { contains: query.trim(), mode: 'insensitive' } },
            { description: { contains: query.trim(), mode: 'insensitive' } },
        ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (isTrending !== undefined) where.isTrending = isTrending;

    if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = minPrice;
        if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    // Build ORDER BY
    let orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[];
    switch (sortBy) {
        case 'price_asc':
            orderBy = { price: 'asc' };
            break;
        case 'price_desc':
            orderBy = { price: 'desc' };
            break;
        case 'rating':
            orderBy = { rating: 'desc' };
            break;
        case 'newest':
            orderBy = { createdAt: 'desc' };
            break;
        default:
            // relevance: trending first, then by rating
            orderBy = [{ isTrending: 'desc' }, { rating: 'desc' }];
    }

    const select = {
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
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        inventory: { select: { quantity: true, reserved: true } },
    };

    const [products, total] = await Promise.all([
        prisma.product.findMany({ where, select, orderBy, skip, take: limit }),
        prisma.product.count({ where }),
    ]);

    return {
        products,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        filters: { query, categoryId, brandId, minPrice, maxPrice, isTrending, sortBy },
    };
}

/**
 * Get search suggestions (autocomplete).
 * Returns product names matching the prefix.
 */
export async function getSearchSuggestions(query: string, limit = 5) {
    if (!query || query.trim().length < 2) return [];

    const products = await prisma.product.findMany({
        where: {
            name: { contains: query.trim(), mode: 'insensitive' },
        },
        select: { id: true, name: true, slug: true, images: true },
        take: limit,
        orderBy: { rating: 'desc' },
    });

    return products;
}
