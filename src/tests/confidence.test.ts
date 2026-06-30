// ---------------------------------------------------------------------------
// confidence.test.ts
// Unit tests for the rule-based confidence scoring system.
//
// Structure:
//   1. scoringConfig   — defaults and baseScoreForSource helper
//   2. fieldScorer     — scoreScalarField, scoreArrayField, weightedAverage
//   3. ConfidenceScorer — full integration with various candidate shapes
// ---------------------------------------------------------------------------

import {
  DEFAULT_BASE_SCORES,
  DEFAULT_FIELD_WEIGHTS,
  baseScoreForSource,
} from '../confidence/scoringConfig';

import {
  presentSourceTypes,
  scoreScalarField,
  scoreArrayField,
  weightedAverage,
} from '../confidence/fieldScorer';

import { ConfidenceScorer } from '../confidence/confidenceScorer';
import type { Candidate }   from '../models/candidate';
import { makeProvenance }   from '../models/provenance';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CSV_PROV    = makeProvenance('csv',    'candidates.csv');
const RESUME_PROV = makeProvenance('resume', 'resume.pdf');

/** Minimal valid Candidate for use in integration tests. */
function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    candidateId:       '00000000-0000-4000-8000-000000000001',
    fullName:          '',
    emails:            [],
    phones:            [],
    skills:            [],
    experience:        [],
    education:         [],
    socialLinks:       [],
    provenance:        [],
    overallConfidence: 0,
    createdAt:         new Date().toISOString(),
    updatedAt:         new Date().toISOString(),
    ...overrides,
  };
}

// ===========================================================================
// 1. scoringConfig
// ===========================================================================

describe('DEFAULT_BASE_SCORES', () => {
  it('csvOnly is 0.9', ()  => expect(DEFAULT_BASE_SCORES.csvOnly).toBe(0.9));
  it('resumeOnly is 0.7', () => expect(DEFAULT_BASE_SCORES.resumeOnly).toBe(0.7));
  it('bothAgree is 1.0', () => expect(DEFAULT_BASE_SCORES.bothAgree).toBe(1.0));
  it('unknown is 0.0',   () => expect(DEFAULT_BASE_SCORES.unknown).toBe(0.0));
});

describe('DEFAULT_FIELD_WEIGHTS', () => {
  it('all weights are positive numbers', () => {
    for (const w of Object.values(DEFAULT_FIELD_WEIGHTS)) {
      expect(w).toBeGreaterThan(0);
    }
  });
});

describe('baseScoreForSource', () => {
  it('returns csvOnly for csv', () => {
    expect(baseScoreForSource('csv', DEFAULT_BASE_SCORES)).toBe(0.9);
  });

  it('returns resumeOnly for resume', () => {
    expect(baseScoreForSource('resume', DEFAULT_BASE_SCORES)).toBe(0.7);
  });
});

// ===========================================================================
// 2. fieldScorer helpers
// ===========================================================================

describe('presentSourceTypes', () => {
  it('returns the set of source types in the provenance list', () => {
    const result = presentSourceTypes([CSV_PROV, RESUME_PROV]);
    expect(result.has('csv')).toBe(true);
    expect(result.has('resume')).toBe(true);
  });

  it('returns an empty set for an empty provenance list', () => {
    expect(presentSourceTypes([])).toEqual(new Set());
  });

  it('deduplicates source types', () => {
    const result = presentSourceTypes([CSV_PROV, CSV_PROV]);
    expect(result.size).toBe(1);
  });
});

describe('scoreScalarField', () => {
  const bs = DEFAULT_BASE_SCORES;

  it('returns unknown (0) when value is undefined', () => {
    const fc = scoreScalarField(undefined, new Set(['csv']), bs, 'fullName');
    expect(fc.score).toBe(0);
  });

  it('returns unknown (0) when value is an empty string', () => {
    const fc = scoreScalarField('', new Set(['csv']), bs, 'fullName');
    expect(fc.score).toBe(0);
  });

  it('returns unknown (0) when no sources present', () => {
    const fc = scoreScalarField('Jane', new Set(), bs, 'fullName');
    expect(fc.score).toBe(0);
  });

  it('returns csvOnly (0.9) when only csv source is present', () => {
    const fc = scoreScalarField('Jane', new Set<'csv' | 'resume'>(['csv']), bs, 'fullName');
    expect(fc.score).toBe(0.9);
    expect(fc.reason).toContain('CSV');
  });

  it('returns resumeOnly (0.7) when only resume source is present', () => {
    const fc = scoreScalarField('Jane', new Set<'csv' | 'resume'>(['resume']), bs, 'fullName');
    expect(fc.score).toBe(0.7);
    expect(fc.reason).toContain('resume');
  });

  it('returns bothAgree (1.0) when both sources are present', () => {
    const fc = scoreScalarField('Jane', new Set<'csv' | 'resume'>(['csv', 'resume']), bs, 'fullName');
    expect(fc.score).toBe(1.0);
    expect(fc.reason).toContain('agree');
  });

  it('includes the field name in the reason', () => {
    const fc = scoreScalarField('Jane', new Set<'csv' | 'resume'>(['csv']), bs, 'fullName');
    expect(fc.reason).toContain('fullName');
  });
});

describe('scoreArrayField', () => {
  const bs = DEFAULT_BASE_SCORES;

  it('returns unknown (0) for an empty array', () => {
    const fc = scoreArrayField([], new Set<'csv' | 'resume'>(['csv']), bs, 'skills');
    expect(fc.score).toBe(0);
  });

  it('returns unknown (0) for undefined', () => {
    const fc = scoreArrayField(undefined, new Set<'csv' | 'resume'>(['csv']), bs, 'skills');
    expect(fc.score).toBe(0);
  });

  it('returns csvOnly (0.9) for a non-empty array from CSV only', () => {
    const fc = scoreArrayField(['Python'], new Set<'csv' | 'resume'>(['csv']), bs, 'skills');
    expect(fc.score).toBe(0.9);
  });

  it('returns resumeOnly (0.7) for a non-empty array from resume only', () => {
    const fc = scoreArrayField(['Python'], new Set<'csv' | 'resume'>(['resume']), bs, 'skills');
    expect(fc.score).toBe(0.7);
  });

  it('returns bothAgree (1.0) when both sources are present', () => {
    const fc = scoreArrayField(['Python'], new Set<'csv' | 'resume'>(['csv', 'resume']), bs, 'skills');
    expect(fc.score).toBe(1.0);
  });
});

describe('weightedAverage', () => {
  it('returns 0 for an empty list', () => {
    expect(weightedAverage([])).toBe(0);
  });

  it('returns the single score when there is one entry', () => {
    expect(weightedAverage([{ score: 0.8, weight: 1 }])).toBe(0.8);
  });

  it('computes a simple average when all weights are equal', () => {
    const result = weightedAverage([
      { score: 1.0, weight: 1 },
      { score: 0.0, weight: 1 },
    ]);
    expect(result).toBeCloseTo(0.5);
  });

  it('weights heavier fields more', () => {
    const result = weightedAverage([
      { score: 1.0, weight: 3 }, // heavier
      { score: 0.0, weight: 1 },
    ]);
    expect(result).toBeCloseTo(0.75); // (1*3 + 0*1) / 4 = 0.75
  });

  it('clamps the result to [0, 1]', () => {
    // Artificially supply a weight-sum of 0 (edge case already handled)
    expect(weightedAverage([{ score: 0, weight: 0 }])).toBe(0);
  });
});

// ===========================================================================
// 3. ConfidenceScorer — integration tests
// ===========================================================================

describe('ConfidenceScorer', () => {
  const scorer = new ConfidenceScorer();

  // ── CSV-only candidate ──────────────────────────────────────────────────
  describe('CSV-only candidate', () => {
    const candidate = makeCandidate({
      fullName:  'Jane Doe',
      emails:    [{ address: 'jane@acme.com', tag: 'work' }],
      phones:    [{ number: '+14155550100', tag: 'mobile' }],
      skills:    [{ name: 'Python' }],
      provenance: [CSV_PROV],
    });

    it('scores fullName at 0.9', () => {
      expect(scorer.score(candidate).fields.fullName?.score).toBe(0.9);
    });

    it('scores emails at 0.9', () => {
      expect(scorer.score(candidate).fields.emails?.score).toBe(0.9);
    });

    it('scores empty education at 0', () => {
      expect(scorer.score(candidate).fields.education?.score).toBe(0);
    });

    it('overall confidence is > 0 and ≤ 1', () => {
      const { overallConfidence } = scorer.score(candidate);
      expect(overallConfidence).toBeGreaterThan(0);
      expect(overallConfidence).toBeLessThanOrEqual(1);
    });

    it('overall confidence is less than 1 (not all fields present)', () => {
      expect(scorer.score(candidate).overallConfidence).toBeLessThan(1);
    });
  });

  // ── Resume-only candidate ───────────────────────────────────────────────
  describe('resume-only candidate', () => {
    const candidate = makeCandidate({
      fullName:  'Jane Doe',
      emails:    [{ address: 'jane@gmail.com' }],
      provenance: [RESUME_PROV],
    });

    it('scores fullName at 0.7', () => {
      expect(scorer.score(candidate).fields.fullName?.score).toBe(0.7);
    });

    it('overall is lower than CSV-only candidate with same fields', () => {
      const csvCandidate = makeCandidate({
        fullName: 'Jane Doe',
        emails:   [{ address: 'jane@gmail.com' }],
        provenance: [CSV_PROV],
      });
      const csvScore    = scorer.score(csvCandidate).overallConfidence;
      const resumeScore = scorer.score(candidate).overallConfidence;
      expect(resumeScore).toBeLessThan(csvScore);
    });
  });

  // ── Both-sources candidate ──────────────────────────────────────────────
  describe('both-sources candidate', () => {
    const candidate = makeCandidate({
      fullName:  'Jane Doe',
      emails:    [{ address: 'jane@acme.com', tag: 'work' }, { address: 'jane@gmail.com' }],
      phones:    [{ number: '+14155550100' }],
      skills:    [{ name: 'Python' }, { name: 'JavaScript' }],
      experience: [{ company: 'Acme', title: 'Engineer' }],
      education:  [{ institution: 'MIT', degree: 'B.S.' }],
      provenance: [CSV_PROV, RESUME_PROV],
    });

    it('scores fullName at 1.0', () => {
      expect(scorer.score(candidate).fields.fullName?.score).toBe(1.0);
    });

    it('scores emails at 1.0', () => {
      expect(scorer.score(candidate).fields.emails?.score).toBe(1.0);
    });

    it('overall confidence is the highest of the three scenarios', () => {
      const csvOnly = makeCandidate({
        fullName: 'Jane Doe', emails: [{ address: 'jane@acme.com' }],
        provenance: [CSV_PROV],
      });
      const resumeOnly = makeCandidate({
        fullName: 'Jane Doe', emails: [{ address: 'jane@acme.com' }],
        provenance: [RESUME_PROV],
      });
      const both = makeCandidate({
        fullName: 'Jane Doe', emails: [{ address: 'jane@acme.com' }],
        provenance: [CSV_PROV, RESUME_PROV],
      });

      const [s1, s2, s3] = [csvOnly, resumeOnly, both].map((c) => scorer.score(c).overallConfidence);
      expect(s3).toBeGreaterThan(s1);
      expect(s3).toBeGreaterThan(s2);
    });
  });

  // ── Fully empty candidate ───────────────────────────────────────────────
  describe('fully empty candidate', () => {
    const candidate = makeCandidate({ provenance: [] });

    it('overall confidence is 0', () => {
      expect(scorer.score(candidate).overallConfidence).toBe(0);
    });

    it('all field scores are 0', () => {
      const { fields } = scorer.score(candidate);
      for (const fc of Object.values(fields)) {
        expect(fc?.score).toBe(0);
      }
    });
  });

  // ── Configurable scores ─────────────────────────────────────────────────
  describe('custom ScoringConfig', () => {
    it('uses custom base scores', () => {
      const custom = new ConfidenceScorer({
        baseScores: { csvOnly: 0.5, resumeOnly: 0.3, bothAgree: 0.8, unknown: 0 },
      });
      const candidate = makeCandidate({
        fullName:  'Jane',
        provenance: [CSV_PROV],
      });
      expect(custom.score(candidate).fields.fullName?.score).toBe(0.5);
    });

    it('uses custom field weights to shift overall score', () => {
      // Give emails weight 0 so it doesn't drag down the score
      const customWeights = new ConfidenceScorer({
        fieldWeights: { ...DEFAULT_FIELD_WEIGHTS, emails: 0 },
      });
      const standard = new ConfidenceScorer();
      const candidate = makeCandidate({
        fullName: 'Jane',
        provenance: [CSV_PROV],
      });
      // Both scorers see the same data; overall values will differ
      const s1 = standard.score(candidate).overallConfidence;
      const s2 = customWeights.score(candidate).overallConfidence;
      // emails is absent → score 0; zeroing its weight removes that drag
      expect(s2).toBeGreaterThanOrEqual(s1);
    });
  });

  // ── Return shape ────────────────────────────────────────────────────────
  describe('return shape', () => {
    it('overallConfidence is always in [0, 1]', () => {
      const candidate = makeCandidate({ provenance: [CSV_PROV] });
      const { overallConfidence } = scorer.score(candidate);
      expect(overallConfidence).toBeGreaterThanOrEqual(0);
      expect(overallConfidence).toBeLessThanOrEqual(1);
    });

    it('returns a reason string for every scored field', () => {
      const candidate = makeCandidate({
        fullName: 'Jane',
        provenance: [CSV_PROV],
      });
      const { fields } = scorer.score(candidate);
      for (const fc of Object.values(fields)) {
        expect(typeof fc?.reason).toBe('string');
      }
    });
  });
});
