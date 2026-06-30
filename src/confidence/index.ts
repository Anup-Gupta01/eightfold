export { ConfidenceScorer } from './confidenceScorer';
export type { IConfidenceScorer } from './confidenceScorer';

export { DEFAULT_SCORING_CONFIG, DEFAULT_BASE_SCORES, DEFAULT_FIELD_WEIGHTS, baseScoreForSource } from './scoringConfig';
export type { ScoringConfig, BaseScores, FieldWeights } from './scoringConfig';

export { presentSourceTypes, scoreScalarField, scoreArrayField, weightedAverage } from './fieldScorer';
