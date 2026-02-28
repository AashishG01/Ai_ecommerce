/**
 * Authorization middleware (role-based access control).
 * Must be used AFTER authenticate middleware.
 *
 * Usage: router.delete('/product/:id', authenticate, authorize('ADMIN'), controller.delete)
 */
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * Factory function that creates middleware to check user roles.
 * @param allowedRoles - Roles permitted to access this route
 */
export function authorize(...allowedRoles: string[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new AppError(401, 'Authentication required.'));
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            next(
                new AppError(
                    403,
                    `Access denied. Required role: ${allowedRoles.join(' or ')}.`
                )
            );
            return;
        }

        next();
    };
}
