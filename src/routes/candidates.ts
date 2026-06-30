import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /candidates
 * Returns a paginated list of processed candidates.
 *
 * TODO: implement with a data store / in-memory cache once the pipeline runs.
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Candidate listing not yet implemented' },
  });
});

/**
 * GET /candidates/:id
 * Returns a single candidate by pipeline-assigned UUID.
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: `Candidate '${id}' lookup not yet implemented` },
  });
});

export { router as candidatesRouter };
