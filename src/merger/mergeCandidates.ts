// ---------------------------------------------------------------------------
// mergeCandidates.ts
// Orchestrates field-level merging of multiple SourcedRecord objects into a
// single complete Candidate.
//
// Pipeline:
//   1. Sort sources by priority (deterministic).
//   2. Merge each field group via its dedicated helper.
//   3. Assemble the final Candidate with pipeline metadata.
//
// Pure function — does not mutate any input object.
// ---------------------------------------------------------------------------

import { randomUUID } from 'crypto';
import type { Candidate, NormalizedRecord } from '../models/candidate';
import type { ProvenanceRecord } from '../models/provenance';
import { getPriority, comparePriority } from './sourcePriority';
import { mergeTextField } from './mergeText';
import { mergeLocation } from './mergeLocation';
import {
  mergeEmails,
  mergePhones,
  mergeSkills,
  mergeExperience,
  mergeEducation,
  mergeSocialLinks,
} from './mergeArrays';
import type { SourcedRecord, MergeTrace } from './mergeTypes';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Describes one input to the merge: the normalized data plus its provenance.
 */
export interface MergeSource {
  record: NormalizedRecord;
  provenance: ProvenanceRecord;
}

/**
 * Merges an array of `MergeSource` objects into one deterministic `Candidate`.
 *
 * Rules:
 *   - CSV sources (priority 1) beat resume sources (priority 2).
 *   - Within the same priority, longer text values are preferred.
 *   - Arrays are unioned and de-duplicated without ordering change.
 *   - Input objects are never mutated.
 *
 * @param sources    - One entry per contributing source (at least one required).
 * @param existingId - Reuse an existing candidateId when updating a record.
 * @returns A fully populated `Candidate` with provenance and timestamps.
 * @throws {Error} when `sources` is empty.
 */
export function mergeCandidates(
  sources: MergeSource[],
  existingId?: string,
): Candidate {
  if (sources.length === 0) {
    throw new Error('mergeCandidates: at least one source is required');
  }

  // ── Step 1: Wrap sources with their priority rank ──────────────────────────
  const sourced: SourcedRecord[] = sources.map((s) => ({
    record: s.record,
    priority: getPriority(s.provenance.sourceType),
    provenance: s.provenance,
  }));

  // ── Step 2: Sort sources deterministically (priority asc, sourceId asc) ───
  const sorted = [...sourced].sort(comparePriority);

  // ── Step 3: Merge each field group ────────────────────────────────────────
  const trace: MergeTrace = {};

  const fullNameResult = mergeTextField(sorted, 'fullName');
  if (fullNameResult.trace) trace['fullName'] = fullNameResult.trace;

  const headlineResult = mergeTextField(sorted, 'headline');
  if (headlineResult.trace) trace['headline'] = headlineResult.trace;

  const emails     = mergeEmails(sorted);
  const phones     = mergePhones(sorted);
  const skills     = mergeSkills(sorted);
  const experience = mergeExperience(sorted);
  const education  = mergeEducation(sorted);
  const socialLinks = mergeSocialLinks(sorted);
  const location   = mergeLocation(sorted);

  // ── Step 4: De-duplicate provenance records ────────────────────────────────
  const provenance = deduplicateProvenance(sorted.map((s) => s.provenance));

  // ── Step 5: Assemble the Candidate ────────────────────────────────────────
  const now = new Date().toISOString();

  const candidate: Candidate = {
    candidateId:      existingId ?? randomUUID(),
    fullName:         fullNameResult.value ?? '',
    emails,
    phones,
    skills,
    experience,
    education,
    socialLinks,
    provenance,
    overallConfidence: 0, // computed by ConfidenceScorer after merge
    createdAt:        now,
    updatedAt:        now,
    ...(location   && { location }),
    ...(headlineResult.value && { headline: headlineResult.value }),
  };

  return candidate;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * De-duplicates provenance records by `sourceId`, preserving insertion order.
 */
function deduplicateProvenance(records: ProvenanceRecord[]): ProvenanceRecord[] {
  const seen = new Set<string>();
  return records.filter((r) => {
    if (seen.has(r.sourceId)) return false;
    seen.add(r.sourceId);
    return true;
  });
}
