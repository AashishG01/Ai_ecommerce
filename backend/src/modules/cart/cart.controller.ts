/**
 * Cart controller — handles HTTP requests for shopping cart.
 */
import { Request, Response, NextFunction } from 'express';
import * as cartService from './cart.service';

/**
 * GET /api/cart
 */
export async function getCart(req: Request, res: Response, next: NextFunction) {
    try {
        const cart = await cartService.getCart(req.user!.userId);
        res.json({ success: true, data: cart });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/cart
 */
export async function addToCart(req: Request, res: Response, next: NextFunction) {
    try {
        const item = await cartService.addToCart(req.user!.userId, req.body);
        res.status(201).json({
            success: true,
            message: 'Item added to cart.',
            data: item,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PATCH /api/cart/:productId
 */
export async function updateCartItem(req: Request, res: Response, next: NextFunction) {
    try {
        const item = await cartService.updateCartItem(
            req.user!.userId,
            req.params.productId as string,
            req.body
        );
        res.json({
            success: true,
            message: 'Cart item updated.',
            data: item,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/cart/:productId
 */
export async function removeFromCart(req: Request, res: Response, next: NextFunction) {
    try {
        await cartService.removeFromCart(req.user!.userId, req.params.productId as string);
        res.json({ success: true, message: 'Item removed from cart.' });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/cart
 */
export async function clearCart(req: Request, res: Response, next: NextFunction) {
    try {
        await cartService.clearCart(req.user!.userId);
        res.json({ success: true, message: 'Cart cleared.' });
    } catch (error) {
        next(error);
    }
}
