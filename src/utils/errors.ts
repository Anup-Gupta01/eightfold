/**
 * AppError — a typed application error that carries an HTTP status code
 * and a machine-readable error code.
 *
 * Throwing AppError from any layer (route, service, etc.) is caught by
 * the global error handler in app.ts and serialized into a consistent
 * ApiErrorResponse.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }
}

// ---------------------------------------------------------------------------
// Convenience factories
// ---------------------------------------------------------------------------

export const Errors = {
  badRequest: (message: string, code = 'BAD_REQUEST') =>
    new AppError(message, 400, code),

  notFound: (resource: string) =>
    new AppError(`${resource} not found`, 404, 'NOT_FOUND'),

  unprocessable: (message: string) =>
    new AppError(message, 422, 'UNPROCESSABLE_ENTITY'),

  internal: (message = 'An unexpected error occurred') =>
    new AppError(message, 500, 'INTERNAL_ERROR', false),
} as const;
