import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /health
 * Liveness probe — always returns 200 if the process is up.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export { router as healthRouter };
