// ---------------------------------------------------------------------------
// fieldScorer.ts
// Pure helper functions that score individual Candidate fields.
//
// Each function answers: "How confident are we about this field value?"
//
// Logic (identical for every field):
//   • Field absent from all sources   → 0.0  (unknown)
//   • Field present in CSV only       → 0.9  (configurable)
//   • Field present in resume only    → 0.7  (configurable)
//   • Both sources provide the field  → 1.0  (configurable)
//     (exact match check for scalars; "both non-empty" for arrays)
//
// Pure functions — no side effects.
// ---------------------------------------------------------------------------

import type { SourceType } from '../models/provenance';
import type { BaseScores } from './scoringConfig';
import { makeFieldConfidence } from '../models/confidence';
import type { FieldConfidence } from '../models/confidence';

// ---------------------------------------------------------------------------
// Source presence helpers
// ---------------------------------------------------------------------------

/**
 * Collects which source types appear in the candidate's provenance list.
 * Used to determine how many (and which) sources contributed.
 */
export function presentSourceTypes(
  provenance: ReadonlyArray<{ sourceType: SourceType }>,
): Set<SourceType> {
  return new Set(provenance.map((p) => p.sourceType));
}

// ---------------------------------------------------------------------------
// Score a scalar (string) field
// ---------------------------------------------------------------------------

/**
 * Scores a scalar text field.
 *
 * @param value        - The merged field value (undefined = absent).
 * @param sources      - Set of source types that contributed to this candidate.
 * @param cfg          - The base score table.
 * @param fieldName    - Human-readable field name for the reason string.
 */
export function scoreScalarField(
  value: string | undefined,
  sources: Set<SourceType>,
  cfg: BaseScores,
  fieldName: string,
): FieldConfidence {
  if (!value || value.trim() === '') {
    return makeFieldConfidence(cfg.unknown, `${fieldName}: absent`);
  }

  const hasCsv    = sources.has('csv');
  const hasResume = sources.has('resume');

  if (hasCsv && hasResume) {
    return makeFieldConfidence(cfg.bothAgree, `${fieldName}: both sources agree`);
  }
  if (hasCsv) {
    return makeFieldConfidence(cfg.csvOnly, `${fieldName}: from CSV`);
  }
  if (hasResume) {
    return makeFieldConfidence(cfg.resumeOnly, `${fieldName}: from resume`);
  }

  return makeFieldConfidence(cfg.unknown, `${fieldName}: absent`);
}

// ---------------------------------------------------------------------------
// Score an array field
// ---------------------------------------------------------------------------

/**
 * Scores an array field (emails, phones, skills, …).
 *
 * An empty merged array scores 0.
 * A non-empty array scores based on how many source types contributed:
 *   - both → bothAgree score
 *   - csv only → csvOnly score
 *   - resume only → resumeOnly score
 *
 * @param array     - The merged array (any non-empty array element type).
 * @param sources   - Set of source types that contributed to this candidate.
 * @param cfg       - The base score table.
 * @param fieldName - Human-readable field name for the reason string.
 */
export function scoreArrayField(
  array: ReadonlyArray<unknown> | undefined,
  sources: Set<SourceType>,
  cfg: BaseScores,
  fieldName: string,
): FieldConfidence {
  if (!array || array.length === 0) {
    return makeFieldConfidence(cfg.unknown, `${fieldName}: empty`);
  }

  const hasCsv    = sources.has('csv');
  const hasResume = sources.has('resume');

  if (hasCsv && hasResume) {
    return makeFieldConfidence(cfg.bothAgree, `${fieldName}: both sources contributed`);
  }
  if (hasCsv) {
    return makeFieldConfidence(cfg.csvOnly, `${fieldName}: from CSV`);
  }
  if (hasResume) {
    return makeFieldConfidence(cfg.resumeOnly, `${fieldName}: from resume`);
  }

  return makeFieldConfidence(cfg.unknown, `${fieldName}: empty`);
}

// ---------------------------------------------------------------------------
// Compute weighted overall score
// ---------------------------------------------------------------------------

/**
 * Computes a single overall confidence score as a normalised weighted average
 * of individual field scores.
 *
 * @param fieldScores - Array of `{ score, weight }` pairs (one per scored field).
 * @returns A clamped value in [0, 1].
 */
export function weightedAverage(
  fieldScores: ReadonlyArray<{ score: number; weight: number }>,
): number {
  if (fieldScores.length === 0) return 0;

  let weightedSum  = 0;
  let totalWeight  = 0;

  for (const { score, weight } of fieldScores) {
    weightedSum += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.min(1, Math.max(0, weightedSum / totalWeight));
}
