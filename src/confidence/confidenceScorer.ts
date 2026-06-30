import { Candidate } from '../models/candidate';
import { ConfidenceReport } from '../models/confidence';

// ---------------------------------------------------------------------------
// Confidence scorer interface
// ---------------------------------------------------------------------------

export interface IConfidenceScorer {
  /**
   * Computes per-field and overall confidence scores for a merged candidate.
   * Scores range from 0 (no confidence) to 1 (fully confident).
   */
  score(candidate: Candidate): ConfidenceReport;
}

// ---------------------------------------------------------------------------
// ConfidenceScorer — skeleton implementation
// ---------------------------------------------------------------------------

export class ConfidenceScorer implements IConfidenceScorer {
  score(_candidate: Candidate): ConfidenceReport {
    // TODO: implement scoring heuristics (field presence, cross-source agreement, format validity)
    throw new Error('ConfidenceScorer.score() not yet implemented');
  }
}
