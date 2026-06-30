import { ResumeNormalizedRecord, RawResumeData } from '../sources/resume/types';

// ---------------------------------------------------------------------------
// Resume normalizer interface
// ---------------------------------------------------------------------------

export interface IResumeNormalizer {
  /**
   * Parses raw PDF text and extracts structured candidate fields.
   * Returns `null` if insufficient information is present.
   */
  normalize(data: RawResumeData): ResumeNormalizedRecord | null;
}

// ---------------------------------------------------------------------------
// ResumeNormalizer — skeleton implementation
// ---------------------------------------------------------------------------

export class ResumeNormalizer implements IResumeNormalizer {
  normalize(_data: RawResumeData): ResumeNormalizedRecord | null {
    // TODO: implement NLP/regex extraction for name, email, skills, experience, education
    throw new Error('ResumeNormalizer.normalize() not yet implemented');
  }
}
