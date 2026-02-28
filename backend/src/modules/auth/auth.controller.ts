/**
 * Auth controller — handles HTTP requests for authentication.
 */
import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';

/**
 * POST /api/auth/signup
 */
export async function signup(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await authService.signup(req.body);

        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            data: {
                user: result.user,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await authService.login(req.body);

        res.json({
            success: true,
            message: 'Login successful.',
            data: {
                user: result.user,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/refresh
 */
export async function refresh(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await authService.refreshAccessToken(req.body.refreshToken);

        res.json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/auth/me
 */
export async function getMe(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await authService.getProfile(req.user!.userId);

        res.json({
            success: true,
            data: { user },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PATCH /api/auth/profile
 */
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await authService.updateProfile(req.user!.userId, req.body);

        res.json({
            success: true,
            message: 'Profile updated successfully.',
            data: { user },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/change-password
 */
export async function changePassword(req: Request, res: Response, next: NextFunction) {
    try {
        await authService.changePassword(
            req.user!.userId,
            req.body.currentPassword,
            req.body.newPassword
        );

        res.json({
            success: true,
            message: 'Password changed successfully.',
        });
    } catch (error) {
        next(error);
    }
}
