/**
 * Review routes.
 */
import { Router } from 'express';
import * as controller from './reviews.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { createReviewSchema, updateReviewSchema } from './reviews.schema';

const router = Router();

// Public: anyone can read reviews
router.get('/product/:productId', controller.getProductReviews);

// Protected routes
router.use(authenticate);

// POST    /api/reviews              — Create a review
router.post('/', validate(createReviewSchema, 'body'), controller.createReview);

// GET     /api/reviews/mine/:productId — Get current user's review for a product
router.get('/mine/:productId', controller.getUserReview);

// PATCH   /api/reviews/:reviewId    — Update a review (author only)
router.patch('/:reviewId', validate(updateReviewSchema, 'body'), controller.updateReview);

// DELETE  /api/reviews/:reviewId    — Delete (author or admin)
router.delete('/:reviewId', controller.deleteReview);

export default router;
