/**
 * Rate limiting middleware.
 * Limits requests per IP to prevent abuse.
 */
import rateLimit from 'express-rate-limit';

// General API rate limiter: 100 requests per minute
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
    },
});

// Stricter limiter for auth routes: 10 per minute
export const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many login attempts, please try again later.',
    },
});
