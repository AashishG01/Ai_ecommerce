/**
 * Payment controller — handles payment endpoints.
 */
import { Request, Response, NextFunction } from 'express';
import * as paymentService from './payments.service';

/**
 * GET /api/payments/:orderId
 */
export async function getPayment(req: Request, res: Response, next: NextFunction) {
    try {
        const payment = await paymentService.getPaymentByOrderId(
            req.params.orderId as string,
            req.user!.userId
        );
        res.json({ success: true, data: payment });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/payments/:orderId/initiate
 */
export async function initiatePayment(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await paymentService.initiatePayment(
            req.params.orderId as string,
            req.user!.userId
        );
        res.json({
            success: true,
            message: 'Payment initiated.',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/payments/webhook
 * Called by the payment gateway (Stripe).
 * No authentication — verified by webhook signature.
 */
export async function webhook(req: Request, res: Response, next: NextFunction) {
    try {
        // In production with Stripe:
        // const sig = req.headers['stripe-signature'];
        // const event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);

        const { gatewayId, eventType } = req.body;
        await paymentService.handlePaymentWebhook(gatewayId, eventType);
        res.json({ success: true, received: true });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/payments/:orderId/simulate-success (dev only)
 */
export async function simulateSuccess(req: Request, res: Response, next: NextFunction) {
    try {
        await paymentService.simulatePaymentSuccess(req.params.orderId as string);
        res.json({ success: true, message: 'Payment simulated as successful.' });
    } catch (error) {
        next(error);
    }
}
