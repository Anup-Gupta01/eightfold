// ---------------------------------------------------------------------------
// textExtractor.ts
// Thin wrapper around pdf-parse.
// Responsibility: open a PDF and return its raw text + page count.
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import type { RawResumeData } from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reads a PDF file from disk and extracts its full text content.
 *
 * @param filePath - Absolute or relative path to the .pdf file.
 * @returns A `RawResumeData` object with the raw text, page count, and origin path.
 * @throws `ResumeExtractError` if the file cannot be read or parsed.
 */
export async function extractTextFromPdf(filePath: string): Promise<RawResumeData> {
  const resolvedPath = path.resolve(filePath);

  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(resolvedPath);
  } catch (err) {
    throw new ResumeExtractError(
      `Cannot read file: ${resolvedPath}`,
      resolvedPath,
      err instanceof Error ? err : undefined,
    );
  }

  let result: Awaited<ReturnType<typeof pdfParse>>;
  try {
    result = await pdfParse(buffer);
  } catch (err) {
    throw new ResumeExtractError(
      `Failed to parse PDF: ${resolvedPath}`,
      resolvedPath,
      err instanceof Error ? err : undefined,
    );
  }

  return {
    text: result.text,
    numPages: result.numpages,
    origin: resolvedPath,
  };
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ResumeExtractError extends Error {
  public readonly filePath: string;
  public readonly cause?: Error;

  constructor(message: string, filePath: string, cause?: Error) {
    super(message);
    this.name = 'ResumeExtractError';
    this.filePath = filePath;
    this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
  }
}
