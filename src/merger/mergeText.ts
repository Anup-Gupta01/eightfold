// ---------------------------------------------------------------------------
// mergeText.ts
// Merges scalar / text fields across multiple sources.
//
// Resolution order (deterministic):
//   1. Take the value from the highest-priority source that provides it.
//   2. If multiple sources have the same priority, prefer the longer value.
//   3. Record a FieldTrace for every resolved field.
//
// Pure functions — no mutations, no side effects.
// ---------------------------------------------------------------------------

import type { SourcedRecord, FieldTrace } from './mergeTypes';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface TextMergeResult {
  value: string | undefined;
  trace: FieldTrace | undefined;
}

/**
 * Picks the best value for a scalar string field across all sources.
 *
 * @param sources - Sources sorted by ascending priority (highest authority first).
 * @param field   - The field name to read from each source's `record`.
 * @returns The chosen value and a trace explaining the decision.
 */
export function mergeTextField(
  sources: SourcedRecord[],
  field: keyof { [K in keyof SourcedRecord['record']]: string },
): TextMergeResult {
  // Collect non-empty candidates from all sources
  const candidates = sources
    .map((s) => ({ value: s.record[field] as string | undefined, source: s }))
    .filter((c): c is { value: string; source: SourcedRecord } =>
      typeof c.value === 'string' && c.value.trim().length > 0,
    );

  if (candidates.length === 0) return { value: undefined, trace: undefined };
  if (candidates.length === 1) {
    return {
      value: candidates[0].value,
      trace: makeTrace(field as string, candidates[0].source, 'only-source'),
    };
  }

  // Group by priority — the first group is the highest authority
  const topPriority = candidates[0].source.priority;
  const topGroup = candidates.filter((c) => c.source.priority === topPriority);

  if (topGroup.length === 1) {
    // Unique highest-priority winner
    return {
      value: topGroup[0].value,
      trace: makeTrace(field as string, topGroup[0].source, 'priority'),
    };
  }

  // Tie-break by longer value (then by sourceId for determinism)
  const winner = topGroup.reduce((best, curr) => {
    if (curr.value.length > best.value.length) return curr;
    if (curr.value.length === best.value.length) {
      // Deterministic tie-break
      return curr.source.provenance.sourceId < best.source.provenance.sourceId
        ? curr
        : best;
    }
    return best;
  });

  return {
    value: winner.value,
    trace: makeTrace(field as string, winner.source, 'longer-value'),
  };
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function makeTrace(
  field: string,
  source: SourcedRecord,
  reason: FieldTrace['reason'],
): FieldTrace {
  return { field, chosenFrom: source.provenance.sourceId, reason };
}
