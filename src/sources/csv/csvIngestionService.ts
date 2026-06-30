// ---------------------------------------------------------------------------
// csvIngestionService.ts
// Orchestrates the CSV ingestion pipeline for a single file.
//
// Stage order:
//   1. Parse file → RawCsvRow[]          (csvParser)
//   2. Validate headers                   (columns / validateHeaders)
//   3. For each row:
//        a. Validate row                  (rowValidator)
//        b. Map row → NormalizedRecord   (rowMapper)
//   4. Return a structured result
//
// This is the only layer that knows about all three sub-modules.
// ---------------------------------------------------------------------------

import path from 'path';
import { parseCsvFile, CsvParseError } from './csvParser';
import { validateHeaders } from './columns';
import { validateRow } from './rowValidator';
import { mapRow } from './rowMapper';
import type { NormalizedRecord } from '../../models/candidate';
import type { RawCsvRow } from './types';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface CsvIngestionResult {
  /** Absolute path to the source file */
  filePath: string;
  /** Total data rows parsed (blank rows excluded) */
  totalRows: number;
  /** Rows successfully mapped to NormalizedRecord */
  validRows: number;
  /** Rows that failed row-level validation */
  invalidRows: number;
  /** The successfully mapped records */
  records: NormalizedRecord[];
  /** Details on every row that was rejected */
  errors: CsvRowError[];
}

export interface CsvRowError {
  /** 1-based row number in the file (header row = 0) */
  rowIndex: number;
  raw: RawCsvRow;
  reason: string;
}

// ---------------------------------------------------------------------------
// Ingestion error — thrown for file-level failures (not row-level)
// ---------------------------------------------------------------------------

export class CsvIngestionError extends Error {
  public readonly filePath: string;
  public readonly cause?: Error;

  constructor(message: string, filePath: string, cause?: Error) {
    super(message);
    this.name = 'CsvIngestionError';
    this.filePath = filePath;
    this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Ingests a recruiter CSV file and returns mapped candidate records.
 *
 * Throws `CsvIngestionError` for file-level failures (not found, unreadable,
 * missing required headers). Row-level failures are collected in `result.errors`
 * and never thrown — callers decide how to handle partial results.
 *
 * @param filePath - Path to the CSV file to ingest.
 */
export async function ingestCsv(filePath: string): Promise<CsvIngestionResult> {
  const resolvedPath = path.resolve(filePath);
  const fileName = path.basename(resolvedPath);

  logger.info('Starting CSV ingestion', { file: fileName });

  // ── Stage 1: Parse file ───────────────────────────────────────────────────
  let headers: string[];
  let rawRows: RawCsvRow[];

  try {
    ({ headers, rows: rawRows } = await parseCsvFile(resolvedPath));
  } catch (err) {
    const cause = err instanceof CsvParseError ? err : undefined;
    const message =
      err instanceof Error ? err.message : 'Unknown parse failure';
    throw new CsvIngestionError(message, resolvedPath, cause);
  }

  logger.info('File parsed', { file: fileName, rowCount: rawRows.length });

  // ── Stage 2: Validate headers ─────────────────────────────────────────────
  const headerResult = validateHeaders(headers);

  if (headerResult.unknown.length > 0) {
    logger.info('Unknown columns will be ignored', {
      file: fileName,
      columns: headerResult.unknown,
    });
  }

  if (!headerResult.valid) {
    throw new CsvIngestionError(
      `Header validation failed:\n${headerResult.missingGroups.join('\n')}`,
      resolvedPath,
    );
  }

  if (rawRows.length === 0) {
    logger.warn('CSV file has headers but no data rows', { file: fileName });
    return emptyResult(resolvedPath);
  }

  // ── Stage 3: Validate and map each row ────────────────────────────────────
  const records: NormalizedRecord[] = [];
  const errors: CsvRowError[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    // rowIndex is 1-based (row 1 = first data row; header = row 0)
    const rowIndex = i + 1;

    const validation = validateRow(row);

    if (!validation.valid) {
      logger.warn('Row failed validation', { file: fileName, rowIndex, reason: validation.reason });
      errors.push({ rowIndex, raw: row, reason: validation.reason });
      continue;
    }

    records.push(mapRow(row));
  }

  const result: CsvIngestionResult = {
    filePath: resolvedPath,
    totalRows: rawRows.length,
    validRows: records.length,
    invalidRows: errors.length,
    records,
    errors,
  };

  logger.info('CSV ingestion complete', {
    file: fileName,
    total: result.totalRows,
    valid: result.validRows,
    invalid: result.invalidRows,
  });

  return result;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function emptyResult(filePath: string): CsvIngestionResult {
  return {
    filePath,
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    records: [],
    errors: [],
  };
}
