/**
 * Search controller — handles search endpoints.
 */
import { Request, Response, NextFunction } from 'express';
import * as searchService from './search.service';

export async function search(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await searchService.searchProducts({
            query: req.query.q as string,
            categoryId: req.query.categoryId as string,
            brandId: req.query.brandId as string,
            minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
            maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
            isTrending: req.query.isTrending === 'true' ? true : req.query.isTrending === 'false' ? false : undefined,
            sortBy: req.query.sortBy as any,
            page: parseInt(req.query.page as string) || 1,
            limit: Math.min(parseInt(req.query.limit as string) || 20, 50),
        });
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

export async function suggest(req: Request, res: Response, next: NextFunction) {
    try {
        const suggestions = await searchService.getSearchSuggestions(
            req.query.q as string,
            Math.min(parseInt(req.query.limit as string) || 5, 10)
        );
        res.json({ success: true, data: suggestions });
    } catch (error) {
        next(error);
    }
}
