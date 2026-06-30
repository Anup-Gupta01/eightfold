// ---------------------------------------------------------------------------
// mergeLocation.ts
// Merges the `location` field across multiple sources.
//
// Strategy: build a composite Location by taking each sub-field from the
// highest-priority source that provides it, falling back to longer values
// for sub-fields where priority is tied.
//
// Pure function — no mutations, no side effects.
// ---------------------------------------------------------------------------

import type { Location } from '../models/common';
import type { SourcedRecord } from './mergeTypes';

// Location sub-fields that can be merged independently.
const LOCATION_FIELDS = ['city', 'state', 'country', 'postalCode', 'raw'] as const;
type LocationField = (typeof LOCATION_FIELDS)[number];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Merges `location` objects from multiple sources into a single `Location`.
 * Each sub-field is resolved independently using the same priority + longer-value rule.
 *
 * @param sources - Sources sorted by ascending priority (highest authority first).
 * @returns A merged `Location` or `undefined` when no source provides any sub-field.
 */
export function mergeLocation(sources: SourcedRecord[]): Location | undefined {
  const merged: Partial<Location> = {};

  for (const subField of LOCATION_FIELDS) {
    const value = pickLocationSubField(sources, subField);
    if (value) merged[subField] = value;
  }

  // Return undefined rather than an empty object
  return Object.keys(merged).length > 0 ? (merged as Location) : undefined;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Picks the best value for a single Location sub-field across all sources,
 * applying the same priority → longer-value rules as the text merger.
 */
function pickLocationSubField(
  sources: SourcedRecord[],
  subField: LocationField,
): string | undefined {
  const candidates = sources
    .map((s) => ({
      value: s.record.location?.[subField],
      priority: s.priority,
      sourceId: s.provenance.sourceId,
    }))
    .filter((c): c is { value: string; priority: number; sourceId: string } =>
      typeof c.value === 'string' && c.value.trim().length > 0,
    );

  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0].value;

  // Sort by priority asc, then by longer value desc, then by sourceId for determinism
  const sorted = [...candidates].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (b.value.length !== a.value.length) return b.value.length - a.value.length;
    return a.sourceId.localeCompare(b.sourceId);
  });

  return sorted[0].value;
}
