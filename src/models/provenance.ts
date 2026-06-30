// ---------------------------------------------------------------------------
// provenance.ts
// Tracks where each piece of data came from.
// ---------------------------------------------------------------------------

/** The raw data source types the pipeline understands. */
export type SourceType = 'csv' | 'resume';

/**
 * One provenance record per source file that contributed to a candidate.
 * Attached to the candidate so the merger and auditors can trace origins.
 */
export interface ProvenanceRecord {
  /** Which kind of source produced this data */
  sourceType: SourceType;
  /** File name, URL, or other human-readable identifier for the source */
  sourceId: string;
  /** ISO-8601 UTC timestamp of when this source was ingested */
  ingestedAt: string;
  /** Optional: row number in CSV, page number in PDF, etc. */
  location?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Type-guard — checks that a string is a known SourceType */
export function isSourceType(value: string): value is SourceType {
  return value === 'csv' || value === 'resume';
}

/** Builds a ProvenanceRecord with the current timestamp. */
export function makeProvenance(
  sourceType: SourceType,
  sourceId: string,
  location?: string,
): ProvenanceRecord {
  return {
    sourceType,
    sourceId,
    ingestedAt: new Date().toISOString(),
    location,
  };
}
