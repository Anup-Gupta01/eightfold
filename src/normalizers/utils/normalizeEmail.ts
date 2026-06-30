// ---------------------------------------------------------------------------
// normalizeEmail.ts
// Normalizes a list of tagged email addresses.
//
// Rules applied (in order):
//   1. Trim surrounding whitespace from the address
//   2. Convert to lowercase
//   3. Remove duplicates (case-insensitive comparison)
//
// Pure function — no mutations, no side effects.
// ---------------------------------------------------------------------------

import type { TaggedEmail } from '../../models/common';

/**
 * Normalizes a `TaggedEmail[]` by trimming, lowercasing, and deduplicating.
 *
 * Invalid entries (non-string or blank address) are silently dropped.
 *
 * @param emails - Raw tagged email list, e.g. from a CSV row or resume parser.
 * @returns A new array with normalized, deduplicated email entries.
 */
export function normalizeEmails(emails: TaggedEmail[]): TaggedEmail[] {
  const seen = new Set<string>();
  const result: TaggedEmail[] = [];

  for (const entry of emails) {
    const address = normalizeEmailAddress(entry.address);
    if (!address) continue;           // drop blank / invalid entries
    if (seen.has(address)) continue;  // deduplicate

    seen.add(address);
    result.push({ ...entry, address });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Shared primitive — also exported for use in other modules
// ---------------------------------------------------------------------------

/**
 * Trims and lowercases a single email address string.
 * Returns `undefined` if the value is blank after trimming.
 */
export function normalizeEmailAddress(raw: string): string | undefined {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : undefined;
}
