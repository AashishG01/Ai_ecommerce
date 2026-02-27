/**
 * EStoreFront Backend — Express.js Entry Point (Production-Ready)
 *
 * Features:
 *   - Helmet security headers
 *   - Rate limiting
 *   - Structured logging (Pino)
 *   - Global error handling
 *   - Graceful shutdown
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import dotenv from 'dotenv';

import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import productRoutes from './modules/products/products.routes';

dotenv.config();

// ─── Validate Required Env Vars ────────────────────────────
const requiredEnvVars = ['DATABASE_URL'];
for (const key of requiredEnvVars) {
    if (!process.env[key]) {
        logger.fatal(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── Security Middleware ───────────────────────────────────
app.use(helmet());
app.use(
    cors({
        origin: [FRONTEND_URL],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// ─── Rate Limiting ─────────────────────────────────────────
app.use('/api/', apiLimiter);

// ─── Body Parsing ──────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ─── Request Logging ───────────────────────────────────────
app.use(
    pinoHttp({
        logger,
        autoLogging: NODE_ENV === 'production',
    })
);

// ─── Routes ────────────────────────────────────────────────
app.use('/api/products', productRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'estorefont-backend',
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

// ─── Global Error Handler (must be last) ───────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────
const server = app.listen(PORT, () => {
    logger.info(`🚀 Backend API running on http://localhost:${PORT} [${NODE_ENV}]`);
});

// ─── Graceful Shutdown ─────────────────────────────────────
async function shutdown(signal: string) {
    logger.info(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
        logger.info('HTTP server closed');
        await prisma.$disconnect();
        logger.info('Database connection closed');
        process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
