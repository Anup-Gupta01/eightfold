import { Candidate } from '../../models/candidate';

// ---------------------------------------------------------------------------
// Raw resume data extracted by pdf-parse (before normalization)
// ---------------------------------------------------------------------------

export interface RawResumeData {
  /** Raw text extracted from the PDF */
  text: string;
  /** Number of pages in the PDF */
  numPages: number;
  /** Path or URL the PDF was loaded from */
  origin: string;
}

// ---------------------------------------------------------------------------
// Resume source interface — to be implemented in sources/resume/resumeParser.ts
// ---------------------------------------------------------------------------

export interface IResumeSource {
  /**
   * Extracts raw text from a PDF resume at `filePath`.
   */
  parse(filePath: string): Promise<RawResumeData>;
}

// ---------------------------------------------------------------------------
// Normalized partial candidate produced by the resume normalizer
// ---------------------------------------------------------------------------

export type ResumeNormalizedRecord = Omit<
  Partial<Candidate>,
  'id' | 'createdAt' | 'updatedAt' | 'sources' | 'confidence'
>;
