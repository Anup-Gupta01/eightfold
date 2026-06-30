import { Router, Request, Response } from 'express';

const router = Router();

/**
 * POST /pipeline/run
 * Triggers the full transformation pipeline.
 * Accepts optional source overrides in the request body.
 *
 * TODO: wire up pipeline orchestrator once business logic is implemented.
 */
router.post('/run', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Pipeline not yet implemented',
    },
  });
});

/**
 * GET /pipeline/status/:jobId
 * Returns the status of a previously submitted pipeline job.
 *
 * TODO: implement job tracking once the pipeline orchestrator is in place.
 */
router.get('/status/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: `Status check for job '${jobId}' not yet implemented`,
    },
  });
});

export { router as pipelineRouter };
