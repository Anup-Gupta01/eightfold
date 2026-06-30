import { Candidate } from '../../models/candidate';

// ---------------------------------------------------------------------------
// Raw CSV row — reflects actual spreadsheet columns before normalization
// ---------------------------------------------------------------------------

export interface RawCsvRow {
  // Identity
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;

  // Location
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;

  // Professional
  headline?: string;
  summary?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  github_url?: string;

  // Serialized arrays (pipe- or comma-separated strings)
  skills?: string;
  experience?: string;
  education?: string;

  // Allow additional unknown columns without breaking the parser
  [key: string]: string | undefined;
}

// ---------------------------------------------------------------------------
// CSV source interface — to be implemented in sources/csv/csvParser.ts
// ---------------------------------------------------------------------------

export interface ICsvSource {
  /**
   * Reads and parses a CSV file from `filePath`.
   * Returns an array of raw rows; normalization happens downstream.
   */
  parse(filePath: string): Promise<RawCsvRow[]>;
}

// ---------------------------------------------------------------------------
// Normalized partial candidate produced by the CSV normalizer
// ---------------------------------------------------------------------------

export type CsvNormalizedRecord = Omit<
  Partial<Candidate>,
  'id' | 'createdAt' | 'updatedAt' | 'sources' | 'confidence'
>;
