// ---------------------------------------------------------------------------
// confidence.ts
// Types and helpers for data-quality confidence scores.
// Scores are always in the range [0, 1].
// ---------------------------------------------------------------------------

import type { Candidate } from './candidate';

/**
 * Confidence score for a single field on the Candidate.
 * `score` ranges from 0 (no data / could not be validated) to 1 (high confidence).
 * `reason` is an optional human-readable explanation.
 */
export interface FieldConfidence {
  score: number;
  reason?: string;
}

/**
 * The full confidence report for one candidate.
 * `overallConfidence` is a composite of all field-level scores.
 */
export interface ConfidenceReport {
  /** Composite score across all scored fields (0–1) */
  overallConfidence: number;
  /** Per-field breakdown, keyed by the field name on Candidate */
  fields: Partial<Record<keyof Candidate, FieldConfidence>>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Clamps a number to [0, 1].
 * Use when aggregating raw signals into a confidence score.
 */
export function clampScore(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Computes a simple arithmetic mean of an array of scores.
 * Returns 0 if the array is empty.
 */
export function averageScores(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, s) => acc + s, 0);
  return clampScore(sum / scores.length);
}

/**
 * Builds a FieldConfidence object, clamping the score automatically.
 */
export function makeFieldConfidence(score: number, reason?: string): FieldConfidence {
  return { score: clampScore(score), reason };
}
