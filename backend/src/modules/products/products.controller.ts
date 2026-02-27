/**
 * Product controller — handles HTTP request/response.
 * Delegates business logic to the service layer.
 */
import { Request, Response, NextFunction } from 'express';
import * as productService from './products.service';
import { ProductQuery } from './products.schema';

export async function listProducts(req: Request, res: Response, next: NextFunction) {
    try {
        const query = req.query as unknown as ProductQuery;
        const result = await productService.listProducts(query);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
}

export async function getProductBySlug(req: Request, res: Response, next: NextFunction) {
    try {
        const product = await productService.getProductBySlug(req.params.slug as string);
        res.json({ success: true, data: product });
    } catch (error) {
        next(error);
    }
}

export async function getCategories(_req: Request, res: Response, next: NextFunction) {
    try {
        const categories = await productService.getCategories();
        res.json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
}

export async function getBrands(_req: Request, res: Response, next: NextFunction) {
    try {
        const brands = await productService.getBrands();
        res.json({ success: true, data: brands });
    } catch (error) {
        next(error);
    }
}

export async function getProductReviews(req: Request, res: Response, next: NextFunction) {
    try {
        const reviews = await productService.getProductReviews(req.params.productId as string);
        res.json({ success: true, data: reviews });
    } catch (error) {
        next(error);
    }
}
