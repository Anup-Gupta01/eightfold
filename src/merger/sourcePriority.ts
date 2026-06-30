// ---------------------------------------------------------------------------
// sourcePriority.ts
// Defines the canonical source priority ranking.
//
// Lower priority number = higher authority.
// CSV (recruiter data) outranks resume (candidate self-report).
// ---------------------------------------------------------------------------

import type { SourceType } from '../models/provenance';

/**
 * Maps each source type to its merge priority.
 * Lower number wins. Extend this object to add new source types.
 */
export const SOURCE_PRIORITY: Record<SourceType, number> = {
  csv:    1, // recruiter-provided data — highest authority
  resume: 2, // candidate self-reported data
};

/**
 * Returns the priority rank for a given source type.
 * Unknown sources receive the lowest possible priority (Infinity).
 */
export function getPriority(sourceType: SourceType): number {
  return SOURCE_PRIORITY[sourceType] ?? Infinity;
}

/**
 * Comparator for sorting `SourcedRecord[]` by ascending priority
 * (i.e., highest-authority sources first).
 * Ties are broken by `sourceId` lexicographically for determinism.
 */
export function comparePriority(
  a: { priority: number; provenance: { sourceId: string } },
  b: { priority: number; provenance: { sourceId: string } },
): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.provenance.sourceId.localeCompare(b.provenance.sourceId);
}
