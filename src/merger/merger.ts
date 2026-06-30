import { Candidate } from '../models/candidate';
import { CsvNormalizedRecord } from '../sources/csv/types';
import { ResumeNormalizedRecord } from '../sources/resume/types';

// ---------------------------------------------------------------------------
// Input to the merger — one record per source
// ---------------------------------------------------------------------------

export interface MergeInput {
  csvRecord?: CsvNormalizedRecord;
  resumeRecord?: ResumeNormalizedRecord;
}

// ---------------------------------------------------------------------------
// Merger interface
// ---------------------------------------------------------------------------

export interface IMerger {
  /**
   * Combines normalized records from multiple sources into a single Candidate.
   * Conflict resolution strategy (e.g., resume-wins, most-complete-field) is
   * determined by the implementation.
   */
  merge(input: MergeInput): Candidate;
}

// ---------------------------------------------------------------------------
// Merger — skeleton implementation
// ---------------------------------------------------------------------------

export class Merger implements IMerger {
  merge(_input: MergeInput): Candidate {
    // TODO: implement field-level merging with conflict resolution
    throw new Error('Merger.merge() not yet implemented');
  }
}
