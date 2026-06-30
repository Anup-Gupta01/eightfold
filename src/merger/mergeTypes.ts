// ---------------------------------------------------------------------------
// mergeTypes.ts
// Shared types used across all merger helper modules.
// ---------------------------------------------------------------------------

import type { NormalizedRecord } from '../models/candidate';
import type { ProvenanceRecord } from '../models/provenance';

// ---------------------------------------------------------------------------
// Source descriptor
// ---------------------------------------------------------------------------

/**
 * Wraps a `NormalizedRecord` with the metadata that the merger needs to apply
 * priority rules and build provenance trails.
 */
export interface SourcedRecord {
  /** The normalized data from this source. */
  record: NormalizedRecord;
  /**
   * Priority rank — lower number wins.
   * CSV = 1 (highest), resume = 2.
   */
  priority: number;
  /** Full provenance record that will be attached to the merged candidate. */
  provenance: ProvenanceRecord;
}

// ---------------------------------------------------------------------------
// Per-field merge trace
// ---------------------------------------------------------------------------

/**
 * Explains where a single merged field value came from.
 * Stored inside `MergeTrace` to give auditors a full decision log.
 */
export interface FieldTrace {
  /** Name of the field, e.g. "fullName" */
  field: string;
  /** sourceId of the winning source */
  chosenFrom: string;
  /** Why this source was chosen */
  reason: 'priority' | 'longer-value' | 'only-source';
}

/**
 * Collected trace for every field that the merger resolved.
 * Keyed by field name for O(1) lookup.
 */
export type MergeTrace = Record<string, FieldTrace>;

// ---------------------------------------------------------------------------
// Output of mergeCandidates()
// ---------------------------------------------------------------------------

export interface MergeResult {
  /** All source provenance records, de-duped by sourceId. */
  provenance: ProvenanceRecord[];
  /** Which source "won" for each text/scalar field. */
  trace: MergeTrace;
}
