import express, { Application, Request, Response, NextFunction } from 'express';
import { healthRouter, pipelineRouter, candidatesRouter } from './routes';
import { AppError } from './utils/errors';
import { logger } from './utils/logger';
import type { ApiErrorResponse } from './models/api';

// ---------------------------------------------------------------------------
// Factory — separated from server.ts so the app can be imported in tests
// without binding to a port.
// ---------------------------------------------------------------------------

export function createApp(): Application {
  const app = express();

  // ── Middleware ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging (minimal; replace with morgan/pino-http if needed)
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.url}`, { ip: req.ip });
    next();
  });

  // ── Routes ──────────────────────────────────────────────────────────────
  app.use('/health', healthRouter);
  app.use('/pipeline', pipelineRouter);
  app.use('/candidates', candidatesRouter);

  // ── 404 handler ─────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    const body: ApiErrorResponse = {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    };
    res.status(404).json(body);
  });

  // ── Global error handler ─────────────────────────────────────────────────
  // Must have 4 parameters for Express to recognise it as an error handler.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError && err.isOperational) {
      logger.warn('Operational error', { code: err.code, message: err.message });

      const body: ApiErrorResponse = {
        success: false,
        error: { code: err.code, message: err.message },
      };
      return res.status(err.statusCode).json(body);
    }

    // Unknown / programmer errors — hide details in production
    logger.error('Unhandled error', {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });

    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          process.env['NODE_ENV'] === 'production'
            ? 'An unexpected error occurred'
            : err.message,
      },
    };
    return res.status(500).json(body);
  });

  return app;
}
