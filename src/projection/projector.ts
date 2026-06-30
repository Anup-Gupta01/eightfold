import { Candidate } from '../models/candidate';

// ---------------------------------------------------------------------------
// Projection — controls which fields are included in the API output
// ---------------------------------------------------------------------------

/**
 * A projection spec maps field names to `true` (include) or `false` (exclude).
 * Semantics mirror MongoDB-style projections (include-list OR exclude-list).
 */
export type ProjectionSpec = Partial<Record<keyof Candidate, boolean>>;

// ---------------------------------------------------------------------------
// Projector interface
// ---------------------------------------------------------------------------

export interface IProjector {
  /**
   * Applies `spec` to `candidate` and returns only the requested fields.
   * The `id`, `createdAt`, and `updatedAt` fields are always included.
   */
  project(candidate: Candidate, spec: ProjectionSpec): Partial<Candidate>;
}

// ---------------------------------------------------------------------------
// Projector — skeleton implementation
// ---------------------------------------------------------------------------

export class Projector implements IProjector {
  project(_candidate: Candidate, _spec: ProjectionSpec): Partial<Candidate> {
    // TODO: implement include/exclude field projection
    throw new Error('Projector.project() not yet implemented');
  }
}
