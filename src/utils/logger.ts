/**
 * A lightweight structured logger.
 * Wraps console methods so that:
 *   - All output is JSON lines in production (easy to ship to log aggregators).
 *   - Human-readable output is emitted in development.
 *
 * Replace the internals with winston / pino when the project grows.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env['LOG_LEVEL'] as LogLevel | undefined) ?? 'info';

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[currentLevel];
}

function format(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  if (process.env['NODE_ENV'] === 'production') {
    return JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...meta });
  }
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${ts}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('debug')) console.debug(format('debug', message, meta));
  },
  info(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('info')) console.info(format('info', message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('warn')) console.warn(format('warn', message, meta));
  },
  error(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('error')) console.error(format('error', message, meta));
  },
};
