// ---------------------------------------------------------------------------
// resumeIngestionService.ts
// Orchestrates the resume ingestion pipeline for a single PDF file.
//
// Stage order:
//   1. Extract raw text from PDF    (textExtractor)
//   2. Normalize text → record      (resumeNormalizer)
//   3. Return a structured result
//
// File-level failures throw `ResumeIngestionError`.
// Normalisation never throws — at worst it returns an empty partial record.
// ---------------------------------------------------------------------------

import path from 'path';
import { extractTextFromPdf, ResumeExtractError } from './textExtractor';
import { normalizeResumeData } from './resumeNormalizer';
import type { NormalizedRecord } from '../../models/candidate';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface ResumeIngestionResult {
  /** Absolute path to the source PDF */
  filePath: string;
  /** Number of pages in the PDF */
  numPages: number;
  /** The normalized candidate record (may be partially populated) */
  record: NormalizedRecord;
  /** Fields that were successfully extracted */
  extractedFields: string[];
}

// ---------------------------------------------------------------------------
// Ingestion error — thrown for file-level failures
// ---------------------------------------------------------------------------

export class ResumeIngestionError extends Error {
  public readonly filePath: string;
  public readonly cause?: Error;

  constructor(message: string, filePath: string, cause?: Error) {
    super(message);
    this.name = 'ResumeIngestionError';
    this.filePath = filePath;
    this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Ingests a single PDF resume and returns a normalized candidate record.
 *
 * Throws `ResumeIngestionError` for file-level failures (not found,
 * unreadable, corrupted PDF). Partial extraction is never an error — callers
 * should inspect `result.extractedFields` to assess completeness.
 *
 * @param filePath - Path to the PDF resume.
 */
export async function ingestResume(filePath: string): Promise<ResumeIngestionResult> {
  const resolvedPath = path.resolve(filePath);
  const fileName = path.basename(resolvedPath);

  logger.info('Starting resume ingestion', { file: fileName });

  // ── Stage 1: Extract raw text ─────────────────────────────────────────────
  let raw: Awaited<ReturnType<typeof extractTextFromPdf>>;

  try {
    raw = await extractTextFromPdf(resolvedPath);
  } catch (err) {
    const cause = err instanceof ResumeExtractError ? err : undefined;
    const message = err instanceof Error ? err.message : 'Unknown extraction failure';
    throw new ResumeIngestionError(message, resolvedPath, cause);
  }

  logger.info('PDF text extracted', { file: fileName, pages: raw.numPages });

  // ── Stage 2: Normalize ────────────────────────────────────────────────────
  const record = normalizeResumeData(raw);

  // ── Stage 3: Report which fields were populated ───────────────────────────
  const extractedFields = listExtractedFields(record);

  logger.info('Resume normalization complete', {
    file: fileName,
    fields: extractedFields,
  });

  return {
    filePath: resolvedPath,
    numPages: raw.numPages,
    record,
    extractedFields,
  };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Returns the names of fields that were populated in the record.
 * Useful for logging and API consumers to gauge parse quality.
 */
function listExtractedFields(record: NormalizedRecord): string[] {
  const fields: string[] = [];

  if (record.fullName)                        fields.push('fullName');
  if (record.emails?.length)                  fields.push('emails');
  if (record.phones?.length)                  fields.push('phones');
  if (record.skills?.length)                  fields.push('skills');
  if (record.education?.length)               fields.push('education');
  if (record.experience?.length)              fields.push('experience');
  if (record.socialLinks?.length)             fields.push('socialLinks');

  return fields;
}
