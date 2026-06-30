import { createApp } from './app';
import { env } from './config';
import { logger } from './utils/logger';

// ---------------------------------------------------------------------------
// Entry point — bind the Express app to a port and start listening.
// ---------------------------------------------------------------------------

const app = createApp();

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info('Server started', {
    host: env.HOST,
    port: env.PORT,
    env: env.NODE_ENV,
  });
});

// ── Graceful shutdown ──────────────────────────────────────────────────────

function shutdown(signal: string): void {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  server.close((err) => {
    if (err) {
      logger.error('Error during server close', { message: err.message });
      process.exit(1);
    }
    logger.info('Server closed. Exiting.');
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
  process.exit(1);
});
