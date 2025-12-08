import dotenv from 'dotenv'; dotenv.config();

// Immediate startup log (before any imports that might fail)
console.log('[STARTUP] Backend starting...');
console.log('[STARTUP] Node version:', process.version);
console.log('[STARTUP] PORT:', process.env.PORT);

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';

console.log('[STARTUP] Imports completed');

import workflowsRouter from './routes/workflows';
import humanReviewRouter from './routes/humanReview';
import logger from './utils/logger';

console.log('[STARTUP] Routes and logger imported');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('[STARTUP] Express app created, PORT:', PORT);

// Initialize Prisma client
const prisma = new PrismaClient();

console.log('[STARTUP] Prisma client created');

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// API routes - with debug logging
app.use('/api/workflows', (req, res, next) => {
  logger.info('Workflow route hit', { method: req.method, path: req.path, url: req.url, originalUrl: req.originalUrl });
  next();
}, workflowsRouter);
app.use('/api/human-review', humanReviewRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Agentic App API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      workflows: {
        start: 'POST /api/workflows/start',
        get: 'GET /api/workflows/:id',
        list: 'GET /api/workflows',
        humanReview: 'POST /api/workflows/:id/human-review',
        versions: 'GET /api/workflows/:id/versions',
        delete: 'DELETE /api/workflows/:id',
      },
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: {
      health: '/health',
      workflows: '/api/workflows/*',
    },
  });
});

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[SHUTDOWN] SIGTERM received');
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[SHUTDOWN] SIGINT received');
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const startServer = async () => {
  console.log('[STARTUP] Starting server...');

  try {
    console.log('[STARTUP] Connecting to database...');
    await prisma.$connect();
    console.log('[STARTUP] Database connected!');
    logger.info('Database connected successfully');

    app.listen(PORT, () => {
      console.log(`[STARTUP] Server listening on port ${PORT}`);
      logger.info(`Server started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
      });
    });
  } catch (error) {
    console.error('[STARTUP] Failed to start server:', error);
    logger.error('Failed to start server', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[ERROR] Uncaught exception:', error);
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled rejection:', reason);
  logger.error('Unhandled promise rejection', {
    reason,
    promise,
  });
  process.exit(1);
});

console.log('[STARTUP] Calling startServer()...');
startServer();

export default app;
