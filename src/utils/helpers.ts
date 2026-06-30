import { randomUUID } from 'crypto';

/**
 * Generates a cryptographically-secure UUID v4.
 * Wraps Node's built-in crypto.randomUUID for testability.
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Returns the current time as an ISO-8601 UTC string.
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Checks whether a value is a non-empty string after trimming.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Trims a string if it is one; returns `undefined` otherwise.
 */
export function toTrimmedString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

/**
 * Normalizes an email address: trim + lowercase.
 * Returns `undefined` if the value is not a non-empty string.
 */
export function normalizeEmail(value: unknown): string | undefined {
  const trimmed = toTrimmedString(value);
  return trimmed ? trimmed.toLowerCase() : undefined;
}

/**
 * Strips all whitespace from a phone string and leaves only digits, `+`, `-`, `(`, `)`.
 */
export function normalizePhone(value: unknown): string | undefined {
  const trimmed = toTrimmedString(value);
  if (!trimmed) return undefined;
  return trimmed.replace(/[^\d+\-().]/g, '');
}
