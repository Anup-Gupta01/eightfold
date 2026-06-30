// ---------------------------------------------------------------------------
// normalizers/utils/index.ts
// Barrel export for all normalizer utility functions.
// ---------------------------------------------------------------------------

export { normalizeEmails, normalizeEmailAddress } from './normalizeEmail';
export { normalizePhones, toE164 } from './normalizePhone';
export { normalizePartialDate, normalizeDateString } from './normalizeDate';
export { normalizeSkills, resolveSkillAlias } from './normalizeSkill';
export { DEFAULT_SKILL_ALIASES } from './skillAliases';
export type { SkillAliasMap } from './skillAliases';
