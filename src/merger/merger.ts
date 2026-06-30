// ---------------------------------------------------------------------------
// merger.ts
// Implements the IMerger interface using the pure mergeCandidates function.
//
// The Merger class is a thin adapter that converts the legacy MergeInput
// shape (csvRecord / resumeRecord) into the generic MergeSource[] accepted
// by mergeCandidates(), then delegates all logic there.
// ---------------------------------------------------------------------------

import type { Candidate, NormalizedRecord } from '../models/candidate';
import type { ProvenanceRecord } from '../models/provenance';
import { makeProvenance } from '../models/provenance';
import { mergeCandidates, type MergeSource } from './mergeCandidates';

// ---------------------------------------------------------------------------
// Input to the merger — one normalized record per source
// ---------------------------------------------------------------------------

export interface MergeInput {
  csvRecord?: NormalizedRecord;
  csvProvenance?: ProvenanceRecord;
  resumeRecord?: NormalizedRecord;
  resumeProvenance?: ProvenanceRecord;
}

// ---------------------------------------------------------------------------
// Merger interface
// ---------------------------------------------------------------------------

export interface IMerger {
  /**
   * Combines normalized records from multiple sources into a single Candidate.
   * CSV data has higher priority than resume data.
   */
  merge(input: MergeInput): Candidate;
}

// ---------------------------------------------------------------------------
// Merger class
// ---------------------------------------------------------------------------

export class Merger implements IMerger {
  /**
   * Merges CSV and resume records into a single deterministic Candidate.
   *
   * If provenance is not provided for a source, a default one is synthesised
   * so that the merger always has something to attach.
   */
  merge(input: MergeInput): Candidate {
    const sources: MergeSource[] = [];

    if (input.csvRecord) {
      sources.push({
        record: input.csvRecord,
        provenance: input.csvProvenance ?? makeProvenance('csv', 'csv-source'),
      });
    }

    if (input.resumeRecord) {
      sources.push({
        record: input.resumeRecord,
        provenance: input.resumeProvenance ?? makeProvenance('resume', 'resume-source'),
      });
    }

    if (sources.length === 0) {
      throw new Error('Merger.merge(): at least one of csvRecord or resumeRecord must be provided');
    }

    return mergeCandidates(sources);
  }
}
