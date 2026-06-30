// ---------------------------------------------------------------------------
// csvParser.ts
// Reads a CSV file from disk and returns its raw headers + rows.
//
// Responsibilities:
//   - Open the file stream
//   - Feed bytes through csv-parser
//   - Normalise header names (trim, lowercase, underscore)
//   - Return raw rows keyed by normalised headers
//   - Handle I/O errors and malformed streams
//
// Does NOT validate columns or map fields — those are separate concerns.
// ---------------------------------------------------------------------------

import fs from 'fs';
import csvParser from 'csv-parser';
import { normalizeHeaderName } from './columns';
import type { RawCsvRow } from './types';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface CsvParseOutput {
  /** Normalised headers extracted from the file's first row */
  headers: string[];
  /** All non-empty rows keyed by normalised header names */
  rows: RawCsvRow[];
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Reads and parses a CSV file asynchronously using a Node.js stream.
 *
 * - Header names are normalised (trimmed, lowercased, underscored).
 * - Rows whose every value is blank are filtered out.
 * - Throws `CsvParseError` on I/O failure or a malformed stream.
 *
 * @param filePath - Absolute or relative path to the .csv file.
 */
export async function parseCsvFile(filePath: string): Promise<CsvParseOutput> {
  await assertFileReadable(filePath);

  return new Promise<CsvParseOutput>((resolve, reject) => {
    const rows: RawCsvRow[] = [];
    let headers: string[] = [];
    let headersCaptured = false;

    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });

    stream.on('error', (err) => {
      reject(new CsvParseError(`Cannot read file: ${err.message}`, filePath));
    });

    stream
      .pipe(
        csvParser({
          // Normalise header names as they arrive so all downstream code
          // can rely on the canonical form.
          mapHeaders: ({ header }) => normalizeHeaderName(header),
          strict: false,   // allow rows with fewer columns than headers
          skipComments: true,
        }),
      )
      .on('headers', (rawHeaders: string[]) => {
        headers = rawHeaders; // already normalised by mapHeaders
        headersCaptured = true;
      })
      .on('data', (row: Record<string, string | undefined>) => {
        if (!isEmptyRow(row)) {
          rows.push(row as RawCsvRow);
        }
      })
      .on('end', () => {
        // Edge-case: file exists but has no header row at all
        if (!headersCaptured) {
          return reject(new CsvParseError('File is empty or has no header row', filePath));
        }
        resolve({ headers, rows });
      })
      .on('error', (err) => {
        reject(new CsvParseError(`CSV parse error: ${err.message}`, filePath));
      });
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if every value in the row is absent or purely whitespace.
 * Used to skip blank lines that csv-parser still emits as row objects.
 */
function isEmptyRow(row: Record<string, string | undefined>): boolean {
  return Object.values(row).every(
    (v) => v === undefined || v === null || v.trim() === '',
  );
}

/**
 * Checks that the file exists and is readable before opening a stream.
 * Provides a clearer error message than the raw ENOENT from fs.createReadStream.
 */
async function assertFileReadable(filePath: string): Promise<void> {
  await fs.promises.access(filePath, fs.constants.R_OK).catch(() => {
    throw new CsvParseError(
      `File not found or not readable: ${filePath}`,
      filePath,
    );
  });
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class CsvParseError extends Error {
  public readonly filePath: string;

  constructor(message: string, filePath: string) {
    super(message);
    this.name = 'CsvParseError';
    this.filePath = filePath;
    Error.captureStackTrace(this, this.constructor);
  }
}
