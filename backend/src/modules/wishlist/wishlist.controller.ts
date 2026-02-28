/**
 * Wishlist controller — handles HTTP requests for wishlists.
 */
import { Request, Response, NextFunction } from 'express';
import * as wishlistService from './wishlist.service';

/**
 * GET /api/wishlist
 */
export async function getWishlist(req: Request, res: Response, next: NextFunction) {
    try {
        const wishlist = await wishlistService.getWishlist(req.user!.userId);
        res.json({ success: true, data: wishlist });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/wishlist
 */
export async function addToWishlist(req: Request, res: Response, next: NextFunction) {
    try {
        const item = await wishlistService.addToWishlist(req.user!.userId, req.body.productId);
        res.status(201).json({
            success: true,
            message: 'Added to wishlist.',
            data: item,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/wishlist/:productId
 */
export async function removeFromWishlist(req: Request, res: Response, next: NextFunction) {
    try {
        await wishlistService.removeFromWishlist(req.user!.userId, req.params.productId as string);
        res.json({ success: true, message: 'Removed from wishlist.' });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/wishlist/check/:productId
 */
export async function checkWishlist(req: Request, res: Response, next: NextFunction) {
    try {
        const isWishlisted = await wishlistService.isInWishlist(
            req.user!.userId,
            req.params.productId as string
        );
        res.json({ success: true, data: { isWishlisted } });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/wishlist/:productId/move-to-cart
 */
export async function moveToCart(req: Request, res: Response, next: NextFunction) {
    try {
        await wishlistService.moveToCart(req.user!.userId, req.params.productId as string);
        res.json({
            success: true,
            message: 'Item moved from wishlist to cart.',
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/wishlist
 */
export async function clearWishlist(req: Request, res: Response, next: NextFunction) {
    try {
        await wishlistService.clearWishlist(req.user!.userId);
        res.json({ success: true, message: 'Wishlist cleared.' });
    } catch (error) {
        next(error);
    }
}
