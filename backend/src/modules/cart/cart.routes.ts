/**
 * Cart routes — all routes require authentication.
 */
import { Router } from 'express';
import * as controller from './cart.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { addToCartSchema, updateCartItemSchema, cartItemParamSchema } from './cart.schema';

const router = Router();

// All cart routes require authentication
router.use(authenticate);

// GET    /api/cart              — Get current user's cart
router.get('/', controller.getCart);

// POST   /api/cart              — Add item to cart
router.post('/', validate(addToCartSchema, 'body'), controller.addToCart);

// PATCH  /api/cart/:productId   — Update item quantity
router.patch('/:productId', validate(updateCartItemSchema, 'body'), controller.updateCartItem);

// DELETE /api/cart/:productId   — Remove item from cart
router.delete('/:productId', controller.removeFromCart);

// DELETE /api/cart              — Clear entire cart
router.delete('/', controller.clearCart);

export default router;
