/**
 * Reviews service — CRUD + rating aggregation.
 *
 * Key feature: On every create/update/delete, we recalculate the
 * product's average rating and review count using a single SQL aggregate.
 */
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CreateReviewInput, UpdateReviewInput } from './reviews.schema';

const reviewSelect = {
    id: true,
    rating: true,
    comment: true,
    createdAt: true,
    user: { select: { id: true, name: true } },
};

/**
 * Recalculate and update product rating + review count.
 * Uses SQL AVG() and COUNT() — always accurate, no drift.
 */
async function recalculateProductRating(productId: string) {
    const result = await prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { rating: true },
    });

    await prisma.product.update({
        where: { id: productId },
        data: {
            rating: result._avg.rating ?? 0,
            reviewCount: result._count.rating,
        },
    });
}

/**
 * Get all reviews for a product.
 */
export async function getProductReviews(productId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
        prisma.review.findMany({
            where: { productId },
            select: reviewSelect,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.review.count({ where: { productId } }),
    ]);

    return {
        reviews,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
}

/**
 * Create a review. One review per user per product (enforced by DB unique constraint).
 */
export async function createReview(userId: string, input: CreateReviewInput) {
    const { productId, rating, comment } = input;

    // Verify product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
        throw new AppError(404, 'Product not found.');
    }

    // Check if user already reviewed
    const existing = await prisma.review.findUnique({
        where: { userId_productId: { userId, productId } },
    });
    if (existing) {
        throw new AppError(409, 'You have already reviewed this product. Use PATCH to update.');
    }

    const review = await prisma.review.create({
        data: { userId, productId, rating, comment },
        select: reviewSelect,
    });

    // Recalculate product rating
    await recalculateProductRating(productId);

    return review;
}

/**
 * Update a review (only the author can update).
 */
export async function updateReview(userId: string, reviewId: string, input: UpdateReviewInput) {
    const review = await prisma.review.findFirst({
        where: { id: reviewId, userId },
    });

    if (!review) {
        throw new AppError(404, 'Review not found.');
    }

    const updated = await prisma.review.update({
        where: { id: reviewId },
        data: input,
        select: reviewSelect,
    });

    await recalculateProductRating(review.productId);

    return updated;
}

/**
 * Delete a review (author or admin can delete).
 */
export async function deleteReview(userId: string, reviewId: string, isAdmin = false) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
        throw new AppError(404, 'Review not found.');
    }

    if (review.userId !== userId && !isAdmin) {
        throw new AppError(403, 'You can only delete your own reviews.');
    }

    await prisma.review.delete({ where: { id: reviewId } });
    await recalculateProductRating(review.productId);
}

/**
 * Get the current user's review for a specific product (if exists).
 */
export async function getUserReview(userId: string, productId: string) {
    return prisma.review.findUnique({
        where: { userId_productId: { userId, productId } },
        select: reviewSelect,
    });
}
