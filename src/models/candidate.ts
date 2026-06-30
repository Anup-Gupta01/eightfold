import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared primitive schemas — reused across source-specific schemas
// ---------------------------------------------------------------------------

export const DateStringSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Date must be in YYYY-MM-DD format',
);

export const NonEmptyString = z.string().min(1).trim();

// ---------------------------------------------------------------------------
// Skill
// ---------------------------------------------------------------------------

export const SkillSchema = z.object({
  name: NonEmptyString,
  yearsOfExperience: z.number().nonnegative().optional(),
  proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
});

export type Skill = z.infer<typeof SkillSchema>;

// ---------------------------------------------------------------------------
// Work Experience
// ---------------------------------------------------------------------------

export const WorkExperienceSchema = z.object({
  company: NonEmptyString,
  title: NonEmptyString,
  startDate: DateStringSchema.optional(),
  endDate: DateStringSchema.optional().nullable(),
  isCurrent: z.boolean().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
});

export type WorkExperience = z.infer<typeof WorkExperienceSchema>;

// ---------------------------------------------------------------------------
// Education
// ---------------------------------------------------------------------------

export const EducationSchema = z.object({
  institution: NonEmptyString,
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  startDate: DateStringSchema.optional(),
  endDate: DateStringSchema.optional().nullable(),
  gpa: z.number().min(0).max(10).optional(),
});

export type Education = z.infer<typeof EducationSchema>;

// ---------------------------------------------------------------------------
// Candidate — the unified, normalized model used throughout the pipeline
// ---------------------------------------------------------------------------

export interface Candidate {
  /** Globally unique identifier assigned by the pipeline (UUID v4) */
  id: string;

  // ── Identity ─────────────────────────────────────────────────────────────
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;

  // ── Location ─────────────────────────────────────────────────────────────
  location?: {
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };

  // ── Professional profile ──────────────────────────────────────────────────
  headline?: string;
  summary?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;

  skills: Skill[];
  experience: WorkExperience[];
  education: Education[];

  // ── Pipeline metadata ─────────────────────────────────────────────────────
  /** Data source(s) that contributed to this record */
  sources: DataSource[];

  /** Confidence scores produced by the confidence module */
  confidence?: ConfidenceScores;

  /** ISO-8601 timestamp of when this record was created by the pipeline */
  createdAt: string;

  /** ISO-8601 timestamp of the last pipeline update */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Source tracking
// ---------------------------------------------------------------------------

export type SourceType = 'csv' | 'resume';

export interface DataSource {
  type: SourceType;
  /** Original file name or remote URL */
  origin: string;
  /** ISO-8601 timestamp of when the source was ingested */
  ingestedAt: string;
}

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

export interface ConfidenceScores {
  /** Overall composite score 0–1 */
  overall: number;
  /** Field-level scores, keyed by Candidate field name */
  fields: Partial<Record<keyof Candidate, number>>;
}

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
  source: string;
  record?: unknown;
  message: string;
  code: string;
}
