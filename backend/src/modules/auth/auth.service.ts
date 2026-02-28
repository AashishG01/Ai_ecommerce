/**
 * Auth service — business logic for authentication.
 */
import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, JwtPayload } from '../../lib/jwt';
import { AppError } from '../../middleware/errorHandler';
import { SignupInput, LoginInput } from './auth.schema';

const SALT_ROUNDS = 12;

/**
 * Register a new user.
 */
export async function signup(input: SignupInput) {
    const { name, email, password } = input;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        throw new AppError(409, 'An account with this email already exists.');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
        data: { name, email, passwordHash },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    // Generate tokens
    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
        user,
        accessToken,
        refreshToken,
    };
}

/**
 * Login with email and password.
 */
export async function login(input: LoginInput) {
    const { email, password } = input;

    // Find user (include passwordHash for verification)
    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
            createdAt: true,
        },
    });

    if (!user) {
        // Generic error to prevent email enumeration
        throw new AppError(401, 'Invalid email or password.');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
        throw new AppError(401, 'Invalid email or password.');
    }

    // Generate tokens
    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Return user WITHOUT passwordHash
    const { passwordHash: _, ...safeUser } = user;

    return {
        user: safeUser,
        accessToken,
        refreshToken,
    };
}

/**
 * Refresh the access token using a valid refresh token.
 */
export async function refreshAccessToken(refreshToken: string) {
    let payload: JwtPayload;

    try {
        payload = verifyRefreshToken(refreshToken);
    } catch {
        throw new AppError(401, 'Invalid or expired refresh token. Please log in again.');
    }

    // Verify user still exists and hasn't been disabled
    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
        throw new AppError(401, 'User no longer exists.');
    }

    // Generate new tokens (rotate refresh token for security)
    const newPayload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    return {
        user,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    };
}

/**
 * Get current user profile.
 */
export async function getProfile(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!user) {
        throw new AppError(404, 'User not found.');
    }

    return user;
}

/**
 * Update user profile (name only for now).
 */
export async function updateProfile(userId: string, data: { name?: string }) {
    const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return user;
}

/**
 * Change password.
 */
export async function changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, passwordHash: true },
    });

    if (!user) {
        throw new AppError(404, 'User not found.');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
        throw new AppError(401, 'Current password is incorrect.');
    }

    // Hash and save new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
    });
}
