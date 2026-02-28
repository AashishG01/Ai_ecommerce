/**
 * Admin controller — HTTP handlers for admin operations.
 */
import { Request, Response, NextFunction } from 'express';
import * as adminService from './admin.service';

// ─── Dashboard ─────────────────────────────────────────────

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
        const stats = await adminService.getDashboardStats();
        res.json({ success: true, data: stats });
    } catch (error) { next(error); }
}

// ─── Products ──────────────────────────────────────────────

export async function createProduct(req: Request, res: Response, next: NextFunction) {
    try {
        const product = await adminService.createProduct(req.body);
        res.status(201).json({ success: true, message: 'Product created.', data: product });
    } catch (error) { next(error); }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
        const product = await adminService.updateProduct(req.params.id as string, req.body);
        res.json({ success: true, message: 'Product updated.', data: product });
    } catch (error) { next(error); }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
        await adminService.deleteProduct(req.params.id as string);
        res.json({ success: true, message: 'Product deleted.' });
    } catch (error) { next(error); }
}

// ─── Inventory ─────────────────────────────────────────────

export async function getLowStock(req: Request, res: Response, next: NextFunction) {
    try {
        const threshold = parseInt(req.query.threshold as string) || 10;
        const products = await adminService.getLowStockProducts(threshold);
        res.json({ success: true, data: products });
    } catch (error) { next(error); }
}

export async function bulkUpdateInventory(req: Request, res: Response, next: NextFunction) {
    try {
        const results = await adminService.bulkUpdateInventory(req.body.updates);
        res.json({ success: true, message: 'Inventory updated.', data: results });
    } catch (error) { next(error); }
}

// ─── Users ─────────────────────────────────────────────────

export async function listUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await adminService.listUsers(page, limit);
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await adminService.updateUserRole(req.params.id as string, req.body.role);
        res.json({ success: true, message: `User role updated to ${req.body.role}.`, data: user });
    } catch (error) { next(error); }
}

// ─── Orders ────────────────────────────────────────────────

export async function listOrders(req: Request, res: Response, next: NextFunction) {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;
        const result = await adminService.listAllOrders(page, limit, status);
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}
