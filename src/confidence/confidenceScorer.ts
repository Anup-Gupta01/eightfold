// ---------------------------------------------------------------------------
// confidenceScorer.ts
// Implements IConfidenceScorer: scores each field of a merged Candidate and
// returns an overall confidence value.
//
// Algorithm (rule-based, no ML):
//   1. Determine which source types contributed (csv / resume / both).
//   2. For each scored field, apply the three-rule table:
//        csv only → 0.9 | resume only → 0.7 | both → 1.0 | absent → 0.0
//   3. Compute a weighted average of field scores → overallConfidence.
//
// All scores and weights are configurable via ScoringConfig.
// ---------------------------------------------------------------------------

import type { Candidate }         from '../models/candidate';
import type { ConfidenceReport, FieldConfidence } from '../models/confidence';
import type { ScoringConfig }     from './scoringConfig';
import { DEFAULT_SCORING_CONFIG } from './scoringConfig';
import {
  presentSourceTypes,
  scoreScalarField,
  scoreArrayField,
  weightedAverage,
} from './fieldScorer';

// ---------------------------------------------------------------------------
// Interface (unchanged — stays compatible with the skeleton)
// ---------------------------------------------------------------------------

export interface IConfidenceScorer {
  score(candidate: Candidate): ConfidenceReport;
}

// ---------------------------------------------------------------------------
// ConfidenceScorer
// ---------------------------------------------------------------------------

export class ConfidenceScorer implements IConfidenceScorer {
  private readonly cfg: ScoringConfig;

  /**
   * @param config - Optional overrides merged on top of DEFAULT_SCORING_CONFIG.
   *                 Supply partial values; anything not specified keeps its default.
   */
  constructor(config: Partial<ScoringConfig> = {}) {
    this.cfg = {
      baseScores:   { ...DEFAULT_SCORING_CONFIG.baseScores,   ...config.baseScores },
      fieldWeights: { ...DEFAULT_SCORING_CONFIG.fieldWeights, ...config.fieldWeights },
    };
  }

  /**
   * Scores every meaningful field of a merged Candidate.
   *
   * @param candidate - The merged Candidate produced by the merger.
   * @returns A ConfidenceReport with per-field scores and an overall score.
   */
  score(candidate: Candidate): ConfidenceReport {
    const { baseScores: bs, fieldWeights: fw } = this.cfg;
    const sources = presentSourceTypes(candidate.provenance);

    // ── Score each field ───────────────────────────────────────────────────
    const fullName    = scoreScalarField(candidate.fullName,  sources, bs, 'fullName');
    const emails      = scoreArrayField(candidate.emails,     sources, bs, 'emails');
    const phones      = scoreArrayField(candidate.phones,     sources, bs, 'phones');
    const skills      = scoreArrayField(candidate.skills,     sources, bs, 'skills');
    const experience  = scoreArrayField(candidate.experience, sources, bs, 'experience');
    const education   = scoreArrayField(candidate.education,  sources, bs, 'education');
    const location    = scoreScalarField(candidate.location?.city ?? candidate.location?.raw, sources, bs, 'location');
    const headline    = scoreScalarField(candidate.headline,  sources, bs, 'headline');
    const socialLinks = scoreArrayField(candidate.socialLinks, sources, bs, 'socialLinks');

    // ── Weighted average → overall ────────────────────────────────────────
    const scoredFields: Array<{ field: keyof typeof fw; fc: FieldConfidence }> = [
      { field: 'fullName',    fc: fullName    },
      { field: 'emails',      fc: emails      },
      { field: 'phones',      fc: phones      },
      { field: 'skills',      fc: skills      },
      { field: 'experience',  fc: experience  },
      { field: 'education',   fc: education   },
      { field: 'location',    fc: location    },
      { field: 'headline',    fc: headline    },
      { field: 'socialLinks', fc: socialLinks },
    ];

    const overallConfidence = weightedAverage(
      scoredFields.map(({ field, fc }) => ({ score: fc.score, weight: fw[field] })),
    );

    return {
      overallConfidence,
      fields: {
        fullName,
        emails,
        phones,
        skills,
        experience,
        education,
        location,
        headline,
        socialLinks,
      },
    };
  }
}
