import { z } from 'zod';
import { Candidate } from '../models/candidate';

// ---------------------------------------------------------------------------
// Candidate validation schema (full record, post-merge)
// ---------------------------------------------------------------------------

export const CandidateSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),

  location: z
    .object({
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
    })
    .optional(),

  headline: z.string().optional(),
  summary: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  portfolioUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),

  skills: z.array(
    z.object({
      name: z.string().min(1),
      yearsOfExperience: z.number().nonnegative().optional(),
      proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    }),
  ),

  experience: z.array(
    z.object({
      company: z.string().min(1),
      title: z.string().min(1),
      startDate: z.string().optional(),
      endDate: z.string().nullable().optional(),
      isCurrent: z.boolean().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
    }),
  ),

  education: z.array(
    z.object({
      institution: z.string().min(1),
      degree: z.string().optional(),
      fieldOfStudy: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().nullable().optional(),
      gpa: z.number().min(0).max(10).optional(),
    }),
  ),

  sources: z.array(
    z.object({
      type: z.enum(['csv', 'resume']),
      origin: z.string(),
      ingestedAt: z.string().datetime(),
    }),
  ),

  confidence: z
    .object({
      overall: z.number().min(0).max(1),
      fields: z.record(z.number().min(0).max(1)),
    })
    .optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}) satisfies z.ZodType<Candidate>;

export type CandidateInput = z.infer<typeof CandidateSchema>;

// ---------------------------------------------------------------------------
// Validator interface
// ---------------------------------------------------------------------------

export interface IValidator {
  /**
   * Validates a candidate record against the schema.
   * Returns `{ valid: true, data }` or `{ valid: false, errors }`.
   */
  validate(input: unknown): ValidationResult;
}

export type ValidationResult =
  | { valid: true; data: Candidate }
  | { valid: false; errors: z.ZodIssue[] };

// ---------------------------------------------------------------------------
// Validator — skeleton implementation
// ---------------------------------------------------------------------------

export class CandidateValidator implements IValidator {
  validate(input: unknown): ValidationResult {
    const result = CandidateSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, errors: result.error.issues };
  }
}
