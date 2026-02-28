/**
 * Payment routes.
 */
import { Router } from 'express';
import * as controller from './payments.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// Webhook — NO authentication (called by payment gateway)
// In production: verify Stripe webhook signature instead
router.post('/webhook', controller.webhook);

// Protected routes
router.use(authenticate);

// GET  /api/payments/:orderId           — Get payment status for an order
router.get('/:orderId', controller.getPayment);

// POST /api/payments/:orderId/initiate  — Initiate payment for a pending order
router.post('/:orderId/initiate', controller.initiatePayment);

// POST /api/payments/:orderId/simulate-success — DEV ONLY: simulate payment
router.post('/:orderId/simulate-success', controller.simulateSuccess);

export default router;
