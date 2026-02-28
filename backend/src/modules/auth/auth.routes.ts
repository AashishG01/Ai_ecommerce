/**
 * Auth routes — maps URLs to controller handlers.
 */
import { Router } from 'express';
import * as controller from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter } from '../../middleware/rateLimiter';
import { signupSchema, loginSchema, refreshTokenSchema } from './auth.schema';

const router = Router();

// ─── Public Routes (rate limited) ──────────────────────────

// POST /api/auth/signup — Register a new user
router.post('/signup', authLimiter, validate(signupSchema, 'body'), controller.signup);

// POST /api/auth/login — Login with email + password
router.post('/login', authLimiter, validate(loginSchema, 'body'), controller.login);

// POST /api/auth/refresh — Get new access token using refresh token
router.post('/refresh', validate(refreshTokenSchema, 'body'), controller.refresh);

// ─── Protected Routes (require authentication) ─────────────

// GET /api/auth/me — Get current user profile
router.get('/me', authenticate, controller.getMe);

// PATCH /api/auth/profile — Update profile
router.patch('/profile', authenticate, controller.updateProfile);

// POST /api/auth/change-password — Change password
router.post('/change-password', authenticate, controller.changePassword);

export default router;
