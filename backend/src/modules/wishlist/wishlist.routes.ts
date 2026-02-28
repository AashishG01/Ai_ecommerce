/**
 * Wishlist routes — all routes require authentication.
 */
import { Router } from 'express';
import * as controller from './wishlist.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { wishlistItemSchema } from './wishlist.schema';

const router = Router();

// All wishlist routes require authentication
router.use(authenticate);

// GET    /api/wishlist                          — Get user's wishlist
router.get('/', controller.getWishlist);

// POST   /api/wishlist                          — Add to wishlist
router.post('/', validate(wishlistItemSchema, 'body'), controller.addToWishlist);

// GET    /api/wishlist/check/:productId         — Check if product is wishlisted
router.get('/check/:productId', controller.checkWishlist);

// POST   /api/wishlist/:productId/move-to-cart  — Move to cart
router.post('/:productId/move-to-cart', controller.moveToCart);

// DELETE /api/wishlist/:productId               — Remove from wishlist
router.delete('/:productId', controller.removeFromWishlist);

// DELETE /api/wishlist                          — Clear wishlist
router.delete('/', controller.clearWishlist);

export default router;
