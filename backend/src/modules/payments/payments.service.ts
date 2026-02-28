/**
 * Payment service — handles payment processing and webhook events.
 *
 * Currently implements a mock Stripe-like flow.
 * When you add the real Stripe SDK, replace the mock functions.
 */
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';

/**
 * Get payment details for an order.
 */
export async function getPaymentByOrderId(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        select: { id: true },
    });

    if (!order) {
        throw new AppError(404, 'Order not found.');
    }

    const payment = await prisma.payment.findFirst({
        where: { orderId },
    });

    if (!payment) {
        throw new AppError(404, 'Payment not found for this order.');
    }

    return payment;
}

/**
 * Simulate initiating a payment (mock Stripe checkout session).
 * In production, this would create a Stripe Checkout Session or Payment Intent.
 */
export async function initiatePayment(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({
        where: { id: orderId, userId, status: 'PENDING' },
        include: { payment: true },
    });

    if (!order) {
        throw new AppError(404, 'Pending order not found.');
    }

    if (order.payment?.status === 'SUCCESS') {
        throw new AppError(400, 'Order is already paid.');
    }

    // Mock: In production, create a Stripe Checkout Session:
    // const session = await stripe.checkout.sessions.create({
    //     line_items: [...],
    //     mode: 'payment',
    //     success_url: `${FRONTEND_URL}/orders/${orderId}?paid=true`,
    //     cancel_url: `${FRONTEND_URL}/orders/${orderId}?cancelled=true`,
    //     metadata: { orderId },
    // });

    const mockGatewayId = `pay_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await prisma.payment.updateMany({
        where: { orderId },
        data: {
            gatewayId: mockGatewayId,
            status: 'PENDING',
        },
    });

    logger.info({ orderId, gatewayId: mockGatewayId }, 'Payment initiated');

    return {
        orderId,
        gatewayId: mockGatewayId,
        // In production: checkoutUrl: session.url,
        checkoutUrl: `/mock-payment/${mockGatewayId}`,
    };
}

/**
 * Handle payment webhook (called by payment gateway).
 * Verifies the event and updates order status.
 *
 * In production with Stripe:
 *   1. Verify webhook signature: stripe.webhooks.constructEvent(body, sig, secret)
 *   2. Handle event type: checkout.session.completed, payment_intent.succeeded, etc.
 *   3. Update order and payment status
 */
export async function handlePaymentWebhook(gatewayId: string, eventType: string) {
    const payment = await prisma.payment.findFirst({
        where: { gatewayId },
        include: { order: true },
    });

    if (!payment) {
        logger.warn({ gatewayId }, 'Webhook: payment not found');
        throw new AppError(404, 'Payment not found.');
    }

    switch (eventType) {
        case 'payment.success': {
            await prisma.$transaction([
                prisma.payment.update({
                    where: { id: payment.id },
                    data: { status: 'SUCCESS' },
                }),
                prisma.order.update({
                    where: { id: payment.orderId },
                    data: { status: 'PAID' as any },
                }),
            ]);
            logger.info({ orderId: payment.orderId, gatewayId }, 'Payment succeeded');
            break;
        }

        case 'payment.failed': {
            await prisma.$transaction(async (tx: any) => {
                await tx.payment.update({
                    where: { id: payment.id },
                    data: { status: 'FAILED' },
                });

                await tx.order.update({
                    where: { id: payment.orderId },
                    data: { status: 'CANCELLED' },
                });

                // Release reserved inventory
                const items = await tx.orderItem.findMany({
                    where: { orderId: payment.orderId },
                });

                for (const item of items) {
                    await tx.inventory.update({
                        where: { productId: item.productId },
                        data: { reserved: { decrement: item.quantity } },
                    });
                }
            });
            logger.info({ orderId: payment.orderId, gatewayId }, 'Payment failed, inventory released');
            break;
        }

        default:
            logger.warn({ eventType, gatewayId }, 'Unhandled webhook event');
    }
}

/**
 * Mock: Simulate a successful payment (for development/testing).
 */
export async function simulatePaymentSuccess(orderId: string) {
    const payment = await prisma.payment.findFirst({ where: { orderId } });
    if (!payment || !payment.gatewayId) {
        throw new AppError(400, 'No initiated payment found for this order.');
    }

    await handlePaymentWebhook(payment.gatewayId, 'payment.success');
}
