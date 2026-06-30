// ---------------------------------------------------------------------------
// resumeNormalizer.ts
// Converts a `RawResumeData` object (plain text + metadata) into the
// canonical `NormalizedRecord` shape understood by the rest of the pipeline.
//
// This is deliberately thin: all field extraction is delegated to
// resumeFieldParser.ts; this file is only responsible for assembly.
// ---------------------------------------------------------------------------

import type { NormalizedRecord } from '../../models/candidate';
import type { RawResumeData } from './types';
import {
  extractName,
  extractEmails,
  extractPhones,
  extractSkills,
  extractEducation,
  extractExperience,
  extractSocialLinks,
} from './resumeFieldParser';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Converts raw resume text into a `NormalizedRecord`.
 *
 * Fields that cannot be extracted are simply omitted — consumers must handle
 * partial records gracefully.
 *
 * @param raw - The raw data returned by `extractTextFromPdf`.
 */
export function normalizeResumeData(raw: RawResumeData): NormalizedRecord {
  const { text } = raw;
  const record: NormalizedRecord = {};

  // ── Name ──────────────────────────────────────────────────────────────────
  const name = extractName(text);
  if (name) record.fullName = name;

  // ── Contact ───────────────────────────────────────────────────────────────
  const emails = extractEmails(text);
  if (emails.length > 0) record.emails = emails;

  const phones = extractPhones(text);
  if (phones.length > 0) record.phones = phones;

  // ── Skills ────────────────────────────────────────────────────────────────
  const skills = extractSkills(text);
  if (skills.length > 0) record.skills = skills;

  // ── Education ─────────────────────────────────────────────────────────────
  const education = extractEducation(text);
  if (education.length > 0) record.education = education;

  // ── Work Experience ───────────────────────────────────────────────────────
  const experience = extractExperience(text);
  if (experience.length > 0) record.experience = experience;

  // ── Social Links ──────────────────────────────────────────────────────────
  const socialLinks = extractSocialLinks(text);
  if (socialLinks.length > 0) record.socialLinks = socialLinks;

  return record;
}
