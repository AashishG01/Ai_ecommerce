/**
 * Admin routes — ALL routes require ADMIN role.
 */
import { Router } from 'express';
import * as controller from './admin.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// ─── Dashboard ─────────────────────────────────────────────
router.get('/dashboard', controller.getDashboard);

// ─── Products ──────────────────────────────────────────────
router.post('/products', controller.createProduct);
router.patch('/products/:id', controller.updateProduct);
router.delete('/products/:id', controller.deleteProduct);

// ─── Inventory ─────────────────────────────────────────────
router.get('/inventory/low-stock', controller.getLowStock);
router.patch('/inventory/bulk', controller.bulkUpdateInventory);

// ─── Users ─────────────────────────────────────────────────
router.get('/users', controller.listUsers);
router.patch('/users/:id/role', controller.updateUserRole);

// ─── Orders ────────────────────────────────────────────────
router.get('/orders', controller.listOrders);

export default router;
