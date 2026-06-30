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

// Use the shared NormalizedRecord type instead of a source-local one.
export { NormalizedRecord as ResumeNormalizedRecord } from '../../models/candidate';
