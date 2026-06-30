export { Merger } from './merger';
export type { IMerger, MergeInput } from './merger';

export { mergeCandidates } from './mergeCandidates';
export type { MergeSource } from './mergeCandidates';

export { mergeTextField } from './mergeText';
export { mergeLocation }  from './mergeLocation';
export {
  mergeEmails,
  mergePhones,
  mergeSkills,
  mergeExperience,
  mergeEducation,
  mergeSocialLinks,
} from './mergeArrays';

export { getPriority, SOURCE_PRIORITY } from './sourcePriority';
export type { SourcedRecord, FieldTrace, MergeTrace } from './mergeTypes';
