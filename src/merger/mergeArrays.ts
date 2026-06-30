// ---------------------------------------------------------------------------
// mergeArrays.ts
// Merges array fields (emails, phones, skills, experience, education,
// socialLinks) from multiple sources without producing duplicates.
//
// Strategy for all arrays:
//   1. Collect entries from all sources in priority order.
//   2. De-duplicate using a field-specific identity key.
//   3. First-seen entry wins (highest-priority source listed first).
//
// Pure functions — no mutations, no side effects.
// ---------------------------------------------------------------------------

import type {
  TaggedEmail,
  TaggedPhone,
  Skill,
  WorkExperience,
  Education,
  SocialLink,
} from '../models/common';
import type { SourcedRecord } from './mergeTypes';

// ---------------------------------------------------------------------------
// Emails
// ---------------------------------------------------------------------------

/**
 * Merges email arrays from all sources, de-duped by normalized address.
 * Highest-priority source's copy of each address is used.
 */
export function mergeEmails(sources: SourcedRecord[]): TaggedEmail[] {
  const seen = new Set<string>();
  const result: TaggedEmail[] = [];

  for (const source of sources) {
    for (const email of source.record.emails ?? []) {
      const key = email.address.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push({ ...email, address: key });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Phones
// ---------------------------------------------------------------------------

/**
 * Merges phone arrays from all sources, de-duped by digits-only key.
 * Highest-priority source's copy of each number is used.
 */
export function mergePhones(sources: SourcedRecord[]): TaggedPhone[] {
  const seen = new Set<string>();
  const result: TaggedPhone[] = [];

  for (const source of sources) {
    for (const phone of source.record.phones ?? []) {
      const key = phone.number.replace(/\D/g, '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push({ ...phone });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

/**
 * Merges skill arrays from all sources, de-duped by lowercase canonical name.
 * Highest-priority source's metadata (proficiency, yearsOfExperience) is used.
 * Result is sorted alphabetically by name.
 */
export function mergeSkills(sources: SourcedRecord[]): Skill[] {
  const seen = new Map<string, Skill>();

  for (const source of sources) {
    for (const skill of source.record.skills ?? []) {
      const key = skill.name.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.set(key, { ...skill });
    }
  }

  return [...seen.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

// ---------------------------------------------------------------------------
// Work Experience
// ---------------------------------------------------------------------------

/**
 * Merges work experience arrays, de-duped by (company, title) key.
 * First occurrence wins; duplicates from lower-priority sources are dropped.
 */
export function mergeExperience(sources: SourcedRecord[]): WorkExperience[] {
  const seen = new Set<string>();
  const result: WorkExperience[] = [];

  for (const source of sources) {
    for (const exp of source.record.experience ?? []) {
      const key = experienceKey(exp);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ ...exp });
    }
  }

  return result;
}

/**
 * Builds a deduplication key for a work experience entry.
 * Uses normalized company + title for a stable, case-insensitive match.
 */
function experienceKey(exp: WorkExperience): string {
  return `${exp.company.trim().toLowerCase()}::${exp.title.trim().toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Education
// ---------------------------------------------------------------------------

/**
 * Merges education arrays, de-duped by (institution, degree) key.
 * First occurrence wins; duplicates from lower-priority sources are dropped.
 */
export function mergeEducation(sources: SourcedRecord[]): Education[] {
  const seen = new Set<string>();
  const result: Education[] = [];

  for (const source of sources) {
    for (const edu of source.record.education ?? []) {
      const key = educationKey(edu);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ ...edu });
    }
  }

  return result;
}

/**
 * Builds a deduplication key for an education entry.
 */
function educationKey(edu: Education): string {
  const degree = edu.degree?.trim().toLowerCase() ?? '';
  return `${edu.institution.trim().toLowerCase()}::${degree}`;
}

// ---------------------------------------------------------------------------
// Social Links
// ---------------------------------------------------------------------------

/**
 * Merges social link arrays, de-duped by (platform, normalised URL).
 * Highest-priority source's URL for each platform is used.
 */
export function mergeSocialLinks(sources: SourcedRecord[]): SocialLink[] {
  const seen = new Set<string>();
  const result: SocialLink[] = [];

  for (const source of sources) {
    for (const link of source.record.socialLinks ?? []) {
      const key = `${link.platform}::${link.url.trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ ...link });
    }
  }

  return result;
}
