// ---------------------------------------------------------------------------
// normalizeDate.ts
// Normalizes a `PartialDate` or a free-form date string to YYYY-MM-DD.
//
// Accepted input forms:
//   PartialDate   { year: 2023, month: 6, day: 15 }  → "2023-06-15"
//   PartialDate   { year: 2023, month: 6 }            → "2023-06"
//   PartialDate   { year: 2023 }                      → "2023"
//   string        "June 2023" / "Jun 2023"            → "2023-06"
//   string        "15/06/2023" | "06-15-2023"         → "2023-06-15"
//   string        "2023-06-15"                        → "2023-06-15" (passthrough)
//
// Output is always a string in ISO-8601 partial format:
//   YYYY | YYYY-MM | YYYY-MM-DD
//
// Pure function — no mutations, no side effects.
// ---------------------------------------------------------------------------

import type { PartialDate } from '../../models/common';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Converts a `PartialDate` to a YYYY-MM-DD string (or YYYY-MM / YYYY when
 * month / day are absent).
 *
 * @param date - A `PartialDate` object.
 * @returns An ISO-8601 partial date string.
 */
export function normalizePartialDate(date: PartialDate): string {
  const year = String(date.year).padStart(4, '0');
  if (date.month === undefined) return year;

  const month = String(date.month).padStart(2, '0');
  if (date.day === undefined) return `${year}-${month}`;

  const day = String(date.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a free-form date string and returns a YYYY-MM-DD (or partial) string.
 * Returns `undefined` when the string cannot be interpreted as a date.
 *
 * Supported formats (examples):
 *   "2023-06-15"          → "2023-06-15"
 *   "15/06/2023"          → "2023-06-15"  (DD/MM/YYYY)
 *   "06-15-2023"          → "2023-06-15"  (MM-DD-YYYY)
 *   "June 2023"           → "2023-06"
 *   "Jun 2023" / "Jun, 2023" → "2023-06"
 *   "2023"                → "2023"
 *
 * @param raw - A free-form date string from a resume or CSV.
 */
export function normalizeDateString(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // Already ISO: YYYY-MM-DD or YYYY-MM
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}$/.test(trimmed)) return trimmed;

  // DD/MM/YYYY or MM/DD/YYYY — treat as DD/MM/YYYY when day > 12
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return resolveAmbiguousDate(slashMatch[1], slashMatch[2], slashMatch[3]);
  }

  // MM-DD-YYYY
  const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    return resolveAmbiguousDate(dashMatch[1], dashMatch[2], dashMatch[3]);
  }

  // "Month YYYY" or "Month, YYYY"
  const monthYearMatch = trimmed.match(/^([A-Za-z]+)[,\s]+(\d{4})$/);
  if (monthYearMatch) {
    const month = monthNameToNumber(monthYearMatch[1]);
    if (month) return `${monthYearMatch[2]}-${String(month).padStart(2, '0')}`;
  }

  // "DD Month YYYY" e.g. "15 June 2023"
  const longMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (longMatch) {
    const month = monthNameToNumber(longMatch[2]);
    if (month) {
      const day = String(parseInt(longMatch[1], 10)).padStart(2, '0');
      return `${longMatch[3]}-${String(month).padStart(2, '0')}-${day}`;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4,
  may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4,
  jun: 6, jul: 7, aug: 8,
  sep: 9, oct: 10, nov: 11, dec: 12,
};

function monthNameToNumber(name: string): number | undefined {
  return MONTH_NAMES[name.toLowerCase()];
}

/**
 * Resolves an ambiguous date with two 1-2 digit components and a 4-digit year.
 * When `a > 12` it must be the day; otherwise we treat as MM-DD-YYYY.
 */
function resolveAmbiguousDate(a: string, b: string, year: string): string {
  const numA = parseInt(a, 10);
  const numB = parseInt(b, 10);

  let month: number;
  let day: number;

  if (numA > 12) {
    // a is definitely the day
    day = numA;
    month = numB;
  } else {
    // Treat as MM-DD-YYYY (North American convention)
    month = numA;
    day = numB;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
