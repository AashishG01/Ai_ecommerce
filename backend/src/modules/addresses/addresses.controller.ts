/**
 * Address controller — handles HTTP requests for addresses.
 */
import { Request, Response, NextFunction } from 'express';
import * as addressService from './addresses.service';

export async function getAddresses(req: Request, res: Response, next: NextFunction) {
    try {
        const addresses = await addressService.getAddresses(req.user!.userId);
        res.json({ success: true, data: addresses });
    } catch (error) { next(error); }
}

export async function createAddress(req: Request, res: Response, next: NextFunction) {
    try {
        const address = await addressService.createAddress(req.user!.userId, req.body);
        res.status(201).json({ success: true, message: 'Address created.', data: address });
    } catch (error) { next(error); }
}

export async function updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
        const address = await addressService.updateAddress(
            req.user!.userId, req.params.id as string, req.body
        );
        res.json({ success: true, message: 'Address updated.', data: address });
    } catch (error) { next(error); }
}

export async function deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
        await addressService.deleteAddress(req.user!.userId, req.params.id as string);
        res.json({ success: true, message: 'Address deleted.' });
    } catch (error) { next(error); }
}
