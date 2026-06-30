export { CsvNormalizer } from './csvNormalizer';
export type { ICsvNormalizer } from './csvNormalizer';

export { ResumeNormalizer } from './resumeNormalizer';
export type { IResumeNormalizer } from './resumeNormalizer';

// ── Normalizer utilities ───────────────────────────────────────────────────
export { normalizeEmails, normalizeEmailAddress } from './utils/normalizeEmail';
export { normalizePhones, toE164 } from './utils/normalizePhone';
export { normalizePartialDate, normalizeDateString } from './utils/normalizeDate';
export { normalizeSkills, resolveSkillAlias } from './utils/normalizeSkill';
export { DEFAULT_SKILL_ALIASES } from './utils/skillAliases';
export type { SkillAliasMap } from './utils/skillAliases';
