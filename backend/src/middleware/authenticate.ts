/**
 * Authentication middleware.
 * Verifies JWT access token from Authorization header.
 * Attaches user payload to req.user.
 */
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../lib/jwt';
import { AppError } from './errorHandler';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * Require a valid access token.
 * Usage: router.get('/profile', authenticate, controller.getProfile)
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError(401, 'Authentication required. Please provide a valid token.');
        }

        const token = authHeader.split(' ')[1];
        const payload = verifyAccessToken(token);
        req.user = payload;
        next();
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else {
            next(new AppError(401, 'Invalid or expired token. Please log in again.'));
        }
    }
}

/**
 * Optional authentication — attaches user if token exists, but doesn't fail.
 * Useful for routes that behave differently for logged-in vs anonymous users.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            req.user = verifyAccessToken(token);
        }
    } catch {
        // Token invalid — continue without user (that's fine for optional auth)
    }
    next();
}
