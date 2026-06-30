// ---------------------------------------------------------------------------
// rowValidator.ts
// Validates a single parsed CSV row against business rules.
//
// Responsibilities:
//   - Check that a row has the minimum data to be usable
//   - Return a typed result (valid | invalid) with a clear reason
//
// Does NOT modify rows, map fields, or read files.
// ---------------------------------------------------------------------------

import type { RawCsvRow } from './types';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type RowValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

// ---------------------------------------------------------------------------
// Column groups used for minimum-presence checks
// ---------------------------------------------------------------------------

/** At least one of these must be non-blank for a row to have a usable name. */
const NAME_COLUMNS: ReadonlyArray<keyof RawCsvRow> = [
  'full_name',
  'name',
  'candidate_name',
  'first_name',
  'last_name',
];

/** At least one of these must be non-blank for a row to have a contact method. */
const CONTACT_COLUMNS: ReadonlyArray<keyof RawCsvRow> = [
  'email',
  'email_address',
  'primary_email',
  'phone',
  'phone_number',
  'mobile',
  'mobile_number',
];

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/**
 * Validates a single CSV row for minimum usability.
 *
 * Rules (applied in order — first failure is returned):
 *   1. The row must have at least one non-blank name column.
 *   2. The row must have at least one non-blank contact column.
 *
 * Rows that fail validation are logged as errors by the ingestion service
 * and excluded from the output — they are NOT silently dropped.
 */
export function validateRow(row: RawCsvRow): RowValidationResult {
  if (!hasAnyValue(row, NAME_COLUMNS)) {
    return {
      valid: false,
      reason: `Row is missing a name. Expected at least one of: ${NAME_COLUMNS.join(', ')}`,
    };
  }

  if (!hasAnyValue(row, CONTACT_COLUMNS)) {
    return {
      valid: false,
      reason: `Row is missing a contact. Expected at least one of: ${CONTACT_COLUMNS.join(', ')}`,
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function hasAnyValue(
  row: RawCsvRow,
  columns: ReadonlyArray<keyof RawCsvRow>,
): boolean {
  return columns.some((col) => isPresent(row[col as string]));
}

function isPresent(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
