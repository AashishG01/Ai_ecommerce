/**
 * Search routes — public (no auth required).
 */
import { Router } from 'express';
import * as controller from './search.controller';

const router = Router();

// GET /api/search?q=headphones&categoryId=...&minPrice=...&sortBy=price_asc&page=1
router.get('/', controller.search);

// GET /api/search/suggest?q=hea
router.get('/suggest', controller.suggest);

export default router;
