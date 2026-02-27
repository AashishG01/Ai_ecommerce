/**
 * Product routes.
 * GET  /api/products            — list with pagination, filters, search
 * GET  /api/products/categories — list all categories
 * GET  /api/products/brands     — list all brands
 * GET  /api/products/reviews/:productId — reviews for a product
 * GET  /api/products/:slug      — single product by slug
 */
import { Router } from 'express';
import * as controller from './products.controller';
import { validate } from '../../middleware/validate';
import { productQuerySchema } from './products.schema';

const router = Router();

router.get('/', validate(productQuerySchema, 'query'), controller.listProducts);
router.get('/categories', controller.getCategories);
router.get('/brands', controller.getBrands);
router.get('/reviews/:productId', controller.getProductReviews);
router.get('/:slug', controller.getProductBySlug);

export default router;
