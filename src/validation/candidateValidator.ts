import { z } from 'zod';
import { Candidate } from '../models/candidate';

// ---------------------------------------------------------------------------
// Primitive schemas
// ---------------------------------------------------------------------------

const TaggedEmailSchema = z.object({
  address: z.string().email(),
  tag: z.enum(['personal', 'work', 'other']).optional(),
});

const TaggedPhoneSchema = z.object({
  number: z.string().min(1),
  tag: z.enum(['mobile', 'work', 'home', 'other']).optional(),
});

const LocationSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  raw: z.string().optional(),
});

const PartialDateSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
});

const SkillSchema = z.object({
  name: z.string().min(1),
  proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  yearsOfExperience: z.number().nonnegative().optional(),
});

const WorkExperienceSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().optional(),
  startDate: PartialDateSchema.optional(),
  endDate: PartialDateSchema.optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().optional(),
});

const EducationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  startDate: PartialDateSchema.optional(),
  endDate: PartialDateSchema.optional(),
  gpa: z.number().min(0).max(10).optional(),
});

const SocialLinkSchema = z.object({
  platform: z.enum(['linkedin', 'github', 'portfolio', 'twitter', 'other']),
  url: z.string().url(),
});

const ProvenanceRecordSchema = z.object({
  sourceType: z.enum(['csv', 'resume']),
  sourceId: z.string().min(1),
  ingestedAt: z.string().datetime(),
  location: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Full candidate schema — validates the entire canonical Candidate shape
// ---------------------------------------------------------------------------

export const CandidateSchema = z.object({
  candidateId: z.string().uuid(),
  fullName: z.string().min(1),

  emails: z.array(TaggedEmailSchema),
  phones: z.array(TaggedPhoneSchema),

  location: LocationSchema.optional(),
  headline: z.string().optional(),

  skills: z.array(SkillSchema),
  experience: z.array(WorkExperienceSchema),
  education: z.array(EducationSchema),
  socialLinks: z.array(SocialLinkSchema),

  provenance: z.array(ProvenanceRecordSchema).min(1),
  overallConfidence: z.number().min(0).max(1),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}) satisfies z.ZodType<Candidate>;

export type CandidateInput = z.infer<typeof CandidateSchema>;

// ---------------------------------------------------------------------------
// Validator interface and implementation
// ---------------------------------------------------------------------------

export type ValidationResult =
  | { valid: true; data: Candidate }
  | { valid: false; errors: z.ZodIssue[] };

export interface IValidator {
  validate(input: unknown): ValidationResult;
}

export class CandidateValidator implements IValidator {
  validate(input: unknown): ValidationResult {
    const result = CandidateSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, errors: result.error.issues };
  }
}
