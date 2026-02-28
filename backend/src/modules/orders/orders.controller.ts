/**
 * Order controller — HTTP handlers for orders.
 */
import { Request, Response, NextFunction } from 'express';
import * as orderService from './orders.service';

/**
 * POST /api/orders
 */
export async function createOrder(req: Request, res: Response, next: NextFunction) {
    try {
        const order = await orderService.createOrder(req.user!.userId, req.body.addressId);
        res.status(201).json({
            success: true,
            message: 'Order created successfully.',
            data: order,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/orders
 */
export async function getOrders(req: Request, res: Response, next: NextFunction) {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const result = await orderService.getUserOrders(req.user!.userId, page, limit);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/orders/:orderId
 */
export async function getOrder(req: Request, res: Response, next: NextFunction) {
    try {
        const isAdmin = req.user!.role === 'ADMIN';
        const order = await orderService.getOrderById(
            req.params.orderId as string,
            req.user!.userId,
            isAdmin
        );
        res.json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
}

/**
 * PATCH /api/orders/:orderId/status (Admin only)
 */
export async function updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const order = await orderService.updateOrderStatus(
            req.params.orderId as string,
            req.body.status
        );
        res.json({
            success: true,
            message: `Order status updated to ${req.body.status}.`,
            data: order,
        });
    } catch (error) {
        next(error);
    }
}
