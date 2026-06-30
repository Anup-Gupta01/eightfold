import { CsvNormalizedRecord, RawCsvRow } from '../sources/csv/types';

// ---------------------------------------------------------------------------
// CSV normalizer interface
// ---------------------------------------------------------------------------

export interface ICsvNormalizer {
  /**
   * Converts a single raw CSV row into a normalized candidate record.
   * Returns `null` if the row cannot be salvaged (e.g., no email/name).
   */
  normalize(row: RawCsvRow): CsvNormalizedRecord | null;
}

// ---------------------------------------------------------------------------
// CsvNormalizer — skeleton implementation
// ---------------------------------------------------------------------------

export class CsvNormalizer implements ICsvNormalizer {
  normalize(_row: RawCsvRow): CsvNormalizedRecord | null {
    // TODO: implement field mapping, string sanitization, skill/experience parsing
    throw new Error('CsvNormalizer.normalize() not yet implemented');
  }
}
