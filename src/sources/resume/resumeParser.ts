import { IResumeSource, RawResumeData } from './types';

// ---------------------------------------------------------------------------
// ResumeParser — skeleton implementation
// Business logic (pdf-parse + NLP extraction) to be added in a later task.
// ---------------------------------------------------------------------------

export class ResumeParser implements IResumeSource {
  /**
   * Extracts raw text from a PDF file.
   * @param filePath - Absolute or relative path to the .pdf file
   */
  async parse(_filePath: string): Promise<RawResumeData> {
    // TODO: implement using pdf-parse
    throw new Error('ResumeParser.parse() not yet implemented');
  }
}
