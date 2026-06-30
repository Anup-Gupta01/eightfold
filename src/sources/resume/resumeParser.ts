// ---------------------------------------------------------------------------
// resumeParser.ts
// Implements IResumeSource — the public-facing class for PDF text extraction.
//
// This class is a thin adapter: it delegates all heavy lifting to
// textExtractor (pdf-parse wrapper) and is kept here to honour the interface
// contract established in types.ts.
// ---------------------------------------------------------------------------

import { IResumeSource, RawResumeData } from './types';
import { extractTextFromPdf, ResumeExtractError } from './textExtractor';

export class ResumeParser implements IResumeSource {
  /**
   * Extracts raw text from a PDF file using pdf-parse.
   *
   * @param filePath - Absolute or relative path to the .pdf file.
   * @returns A `RawResumeData` object containing the text, page count, and origin.
   * @throws `ResumeExtractError` if the file cannot be read or is not a valid PDF.
   */
  async parse(filePath: string): Promise<RawResumeData> {
    try {
      return await extractTextFromPdf(filePath);
    } catch (err) {
      if (err instanceof ResumeExtractError) throw err;
      // Wrap unexpected errors in a consistent type
      throw new ResumeExtractError(
        `Unexpected error while parsing PDF: ${filePath}`,
        filePath,
        err instanceof Error ? err : undefined,
      );
    }
  }
}
