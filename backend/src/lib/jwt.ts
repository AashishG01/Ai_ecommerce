/**
 * JWT utility — generates and verifies access + refresh tokens.
 */
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';

const ACCESS_EXPIRES_IN = '15m';    // short-lived
const REFRESH_EXPIRES_IN = '7d';    // long-lived

export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}

/**
 * Generate an access token (15 min).
 */
export function generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

/**
 * Generate a refresh token (7 days).
 */
export function generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

/**
 * Verify an access token.
 */
export function verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

/**
 * Verify a refresh token.
 */
export function verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
