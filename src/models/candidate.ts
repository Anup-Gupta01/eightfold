// ---------------------------------------------------------------------------
// candidate.ts
// The canonical data model for a pipeline candidate.
// Every source (CSV, resume, …) normalizes its data into this shape.
// ---------------------------------------------------------------------------

import type {
  TaggedEmail,
  TaggedPhone,
  Location,
  Skill,
  WorkExperience,
  Education,
  SocialLink,
} from './common';

import type { ProvenanceRecord } from './provenance';

// ---------------------------------------------------------------------------
// Candidate — the single source of truth across the pipeline
// ---------------------------------------------------------------------------

export interface Candidate {
  /**
   * Pipeline-assigned UUID v4.
   * Assigned once at creation; never changes across updates.
   */
  candidateId: string;

  // ── Identity ──────────────────────────────────────────────────────────────

  /** Best available full name, e.g. "Jane Doe" */
  fullName: string;

  // ── Contact ───────────────────────────────────────────────────────────────

  /**
   * All known email addresses for this candidate.
   * Duplicates are de-duped by normalized address (lowercase, trimmed).
   */
  emails: TaggedEmail[];

  /**
   * All known phone numbers.
   * Duplicates are de-duped by normalized digits.
   */
  phones: TaggedPhone[];

  // ── Location ──────────────────────────────────────────────────────────────

  /** Primary location; may be partially populated. */
  location?: Location;

  // ── Professional summary ──────────────────────────────────────────────────

  /** Short professional headline, e.g. "Senior Backend Engineer" */
  headline?: string;

  // ── Skills ────────────────────────────────────────────────────────────────

  /** De-duped list of skills, ordered by name ascending after normalization */
  skills: Skill[];

  // ── Work history ──────────────────────────────────────────────────────────

  /** Chronologically descending list of work experiences */
  experience: WorkExperience[];

  // ── Education ─────────────────────────────────────────────────────────────

  /** Chronologically descending list of education entries */
  education: Education[];

  // ── Online presence ───────────────────────────────────────────────────────

  /** De-duped list of social/portfolio links */
  socialLinks: SocialLink[];

  // ── Pipeline metadata ─────────────────────────────────────────────────────

  /**
   * One record per source file that contributed to this candidate.
   * Populated by the ingest layer; never mutated after merge.
   */
  provenance: ProvenanceRecord[];

  /**
   * Overall data-quality confidence: 0 (low) → 1 (high).
   * Computed by the confidence module after merging.
   */
  overallConfidence: number;

  /** ISO-8601 UTC timestamp: when this record was first created */
  createdAt: string;

  /** ISO-8601 UTC timestamp: when this record was last updated */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Partial candidate — used throughout the pipeline before the final merge
// ---------------------------------------------------------------------------

/**
 * A partial candidate produced by a normalizer.
 * All fields are optional; the merger will combine and fill in gaps.
 * `candidateId`, `provenance`, `overallConfidence`, `createdAt`, and `updatedAt`
 * are excluded — they are assigned by the pipeline, not by normalizers.
 */
export type NormalizedRecord = Partial<
  Omit<Candidate, 'candidateId' | 'provenance' | 'overallConfidence' | 'createdAt' | 'updatedAt'>
>;

// ---------------------------------------------------------------------------
// Pipeline result wrapper
// ---------------------------------------------------------------------------

export type PipelineStatus = 'success' | 'partial' | 'failed';

export interface PipelineResult {
  status: PipelineStatus;
  processedAt: string;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  candidates: Candidate[];
  errors: PipelineError[];
}

export interface PipelineError {
  sourceId: string;
  record?: unknown;
  message: string;
  code: string;
}
