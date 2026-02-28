/**
 * Reviews controller — HTTP handlers.
 */
import { Request, Response, NextFunction } from 'express';
import * as reviewService from './reviews.service';

export async function getProductReviews(req: Request, res: Response, next: NextFunction) {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const result = await reviewService.getProductReviews(
            req.params.productId as string, page, limit
        );
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function createReview(req: Request, res: Response, next: NextFunction) {
    try {
        const review = await reviewService.createReview(req.user!.userId, req.body);
        res.status(201).json({ success: true, message: 'Review created.', data: review });
    } catch (error) { next(error); }
}

export async function updateReview(req: Request, res: Response, next: NextFunction) {
    try {
        const review = await reviewService.updateReview(
            req.user!.userId, req.params.reviewId as string, req.body
        );
        res.json({ success: true, message: 'Review updated.', data: review });
    } catch (error) { next(error); }
}

export async function deleteReview(req: Request, res: Response, next: NextFunction) {
    try {
        const isAdmin = req.user!.role === 'ADMIN';
        await reviewService.deleteReview(req.user!.userId, req.params.reviewId as string, isAdmin);
        res.json({ success: true, message: 'Review deleted.' });
    } catch (error) { next(error); }
}

export async function getUserReview(req: Request, res: Response, next: NextFunction) {
    try {
        const review = await reviewService.getUserReview(
            req.user!.userId, req.params.productId as string
        );
        res.json({ success: true, data: review });
    } catch (error) { next(error); }
}
