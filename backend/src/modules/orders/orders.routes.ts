/**
 * Order routes.
 */
import { Router } from 'express';
import * as controller from './orders.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { createOrderSchema, updateOrderStatusSchema } from './orders.schema';

const router = Router();

router.use(authenticate);

// POST   /api/orders                — Create order from cart
router.post('/', validate(createOrderSchema, 'body'), controller.createOrder);

// GET    /api/orders                — Get user's orders (paginated)
router.get('/', controller.getOrders);

// GET    /api/orders/:orderId       — Get order details
router.get('/:orderId', controller.getOrder);

// PATCH  /api/orders/:orderId/status — Update order status (admin only)
router.patch(
    '/:orderId/status',
    authorize('ADMIN'),
    validate(updateOrderStatusSchema, 'body'),
    controller.updateStatus
);

export default router;
