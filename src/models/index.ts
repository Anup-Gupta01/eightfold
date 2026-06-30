// ---------------------------------------------------------------------------
// models/index.ts — single import point for the entire model layer
//
//   import { Candidate, Skill, makeProvenance } from '@models/index'
// ---------------------------------------------------------------------------

// ── common ──────────────────────────────────────────────────────────────────
export type {
  PartialDate,
  EmailTag,
  PhoneTag,
  TaggedEmail,
  TaggedPhone,
  Location,
  SkillProficiency,
  Skill,
  WorkExperience,
  Education,
  SocialPlatform,
  SocialLink,
} from './common';

// ── provenance ───────────────────────────────────────────────────────────────
export type { SourceType, ProvenanceRecord } from './provenance';
export { isSourceType, makeProvenance } from './provenance';

// ── confidence ───────────────────────────────────────────────────────────────
export type { FieldConfidence, ConfidenceReport } from './confidence';
export { clampScore, averageScores, makeFieldConfidence } from './confidence';

// ── candidate ────────────────────────────────────────────────────────────────
export type {
  Candidate,
  NormalizedRecord,
  PipelineStatus,
  PipelineResult,
  PipelineError,
} from './candidate';

// ── api ──────────────────────────────────────────────────────────────────────
export type {
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  PaginationMeta,
  PaginatedResponse,
} from './api';
