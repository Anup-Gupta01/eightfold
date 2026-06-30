// ---------------------------------------------------------------------------
// normalizePhone.ts
// Normalizes a list of tagged phone numbers to E.164 format.
//
// E.164 format: +[country code][subscriber number], digits only after +.
// Example: "+14155550100"
//
// Strategy:
//   1. Strip all non-digit characters (keep a leading +).
//   2. If the number has no country code, assume +1 (North America) for
//      10-digit numbers as a sensible default.
//   3. Deduplicate by normalised digit string.
//   4. Drop entries that cannot be brought to a plausible E.164 length
//      (7–15 digits after the +).
//
// Pure function — no mutations, no side effects.
// ---------------------------------------------------------------------------

import type { TaggedPhone } from '../../models/common';

// E.164 allows 7–15 digits after the country code.
const MIN_DIGITS = 7;
const MAX_DIGITS = 15;

/**
 * Normalizes a `TaggedPhone[]` to E.164 format and deduplicates.
 *
 * @param phones - Raw tagged phone list.
 * @param defaultCountryCode - Country code to prepend when no code is present.
 *                             Defaults to `'1'` (North America).
 * @returns A new array with E.164-formatted, deduplicated phone entries.
 */
export function normalizePhones(
  phones: TaggedPhone[],
  defaultCountryCode = '1',
): TaggedPhone[] {
  const seen = new Set<string>();
  const result: TaggedPhone[] = [];

  for (const entry of phones) {
    const e164 = toE164(entry.number, defaultCountryCode);
    if (!e164) continue;          // unparseable — drop
    if (seen.has(e164)) continue; // duplicate — skip

    seen.add(e164);
    result.push({ ...entry, number: e164 });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Shared primitive — also exported for direct use
// ---------------------------------------------------------------------------

/**
 * Converts a raw phone string to E.164 format.
 *
 * Returns `undefined` when the input cannot be resolved to a valid E.164 number.
 *
 * @param raw               - Raw phone string (any format).
 * @param defaultCountryCode - Digits-only country code, e.g. `'1'` or `'44'`.
 */
export function toE164(raw: string, defaultCountryCode = '1'): string | undefined {
  // Step 1: preserve a leading '+', then extract digits only.
  const hasPlus = raw.trimStart().startsWith('+');
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 0) return undefined;

  let e164Digits: string;

  if (hasPlus) {
    // Already includes a country code — use digits as-is.
    e164Digits = digits;
  } else if (digits.startsWith('0')) {
    // Leading trunk prefix (e.g. UK "07911123456" → "+447911123456").
    // Strip the leading '0' and prepend the country code.
    e164Digits = `${defaultCountryCode}${digits.slice(1)}`;
  } else if (digits.length === 10) {
    // 10 digits without a '+' → assume defaultCountryCode (North America).
    e164Digits = `${defaultCountryCode}${digits}`;
  } else if (digits.length === 11 && digits.startsWith(defaultCountryCode)) {
    // 11 digits starting with the default country code (e.g. "14155550100").
    e164Digits = digits;
  } else {
    // Unknown format — use the digits as-is (best effort).
    e164Digits = digits;
  }

  if (e164Digits.length < MIN_DIGITS || e164Digits.length > MAX_DIGITS) {
    return undefined; // not a plausible phone number
  }

  return `+${e164Digits}`;
}
