// ---------------------------------------------------------------------------
// scoringConfig.ts
// Defines the configurable base-score table and field weights used by the
// confidence scorer.
//
// All values are in [0, 1].  Override by passing a partial ScoringConfig to
// ConfidenceScorer's constructor — your values are merged on top of the
// defaults.
// ---------------------------------------------------------------------------

import type { SourceType } from '../models/provenance';

// ---------------------------------------------------------------------------
// Base scores per source type
// ---------------------------------------------------------------------------

/**
 * The raw score assigned to a field value based solely on where it came from.
 *
 * | Situation                  | Score |
 * |----------------------------|-------|
 * | CSV (recruiter) only       |  0.9  |
 * | Resume (candidate) only    |  0.7  |
 * | Both sources agree         |  1.0  |
 * | Field absent / unknown     |  0.0  |
 */
export interface BaseScores {
  /** Score when the field came only from a CSV source. */
  csvOnly:   number;
  /** Score when the field came only from a resume source. */
  resumeOnly: number;
  /** Score when CSV and resume agree on the same value. */
  bothAgree:  number;
  /** Score when the field is missing from all sources. */
  unknown:    number;
}

export const DEFAULT_BASE_SCORES: BaseScores = {
  csvOnly:    0.9,
  resumeOnly: 0.7,
  bothAgree:  1.0,
  unknown:    0.0,
};

// ---------------------------------------------------------------------------
// Per-field weights
// ---------------------------------------------------------------------------

/**
 * Relative importance of each scored field when computing `overallConfidence`.
 * Values do not need to sum to 1 — they are normalised internally.
 *
 * Higher weight = more influence on the overall score.
 */
export interface FieldWeights {
  fullName:    number;
  emails:      number;
  phones:      number;
  skills:      number;
  experience:  number;
  education:   number;
  location:    number;
  headline:    number;
  socialLinks: number;
}

export const DEFAULT_FIELD_WEIGHTS: FieldWeights = {
  fullName:    3,   // most important — identity anchor
  emails:      3,   // primary contact
  phones:      2,
  skills:      2,
  experience:  2,
  education:   1,
  location:    1,
  headline:    1,
  socialLinks: 1,
};

// ---------------------------------------------------------------------------
// Combined config
// ---------------------------------------------------------------------------

export interface ScoringConfig {
  baseScores:   BaseScores;
  fieldWeights: FieldWeights;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  baseScores:   DEFAULT_BASE_SCORES,
  fieldWeights: DEFAULT_FIELD_WEIGHTS,
};

// ---------------------------------------------------------------------------
// Helper: look up the base score for a single source type
// ---------------------------------------------------------------------------

/**
 * Returns the base score for a field that came from exactly one source.
 * Use `baseScores.bothAgree` separately when both sources are present.
 */
export function baseScoreForSource(
  sourceType: SourceType,
  cfg: BaseScores,
): number {
  switch (sourceType) {
    case 'csv':    return cfg.csvOnly;
    case 'resume': return cfg.resumeOnly;
    default:       return cfg.unknown;
  }
}
