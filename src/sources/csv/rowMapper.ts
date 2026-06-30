// ---------------------------------------------------------------------------
// rowMapper.ts
// Maps a validated RawCsvRow to a NormalizedRecord (the canonical model).
//
// Responsibilities:
//   - Structurally assign CSV column values to the canonical schema fields
//   - Handle column aliases (e.g. "email_address" → emails[])
//   - Compose arrays where the model expects them (emails, phones, socialLinks)
//
// Does NOT:
//   - Validate data (that is rowValidator's job)
//   - Normalise strings (no lowercasing, trimming, deduplication)
//   - Parse serialised sub-records (skills/experience/education strings)
//     — that is the normalizer's job in the next pipeline stage
// ---------------------------------------------------------------------------

import type { NormalizedRecord } from '../../models/candidate';
import type {
  TaggedEmail,
  TaggedPhone,
  Location,
  WorkExperience,
  SocialLink,
} from '../../models/common';
import type { RawCsvRow } from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Maps a single validated CSV row to a `NormalizedRecord`.
 *
 * All fields are optional on `NormalizedRecord` — missing CSV columns
 * simply result in that field being absent from the output object.
 *
 * @param row - A row that has already passed `validateRow`.
 */
export function mapRow(row: RawCsvRow): NormalizedRecord {
  const record: NormalizedRecord = {};

  // ── Full name ─────────────────────────────────────────────────────────────
  const fullName = pickFirst(row, ['full_name', 'name', 'candidate_name']);
  const firstName = pickFirst(row, ['first_name']);
  const lastName = pickFirst(row, ['last_name']);

  if (fullName) {
    record.fullName = fullName;
  } else if (firstName || lastName) {
    // Structural combination — not string normalisation
    record.fullName = [firstName, lastName].filter(Boolean).join(' ');
  }

  // ── Emails ────────────────────────────────────────────────────────────────
  const emails = mapEmails(row);
  if (emails.length > 0) record.emails = emails;

  // ── Phones ────────────────────────────────────────────────────────────────
  const phones = mapPhones(row);
  if (phones.length > 0) record.phones = phones;

  // ── Location ──────────────────────────────────────────────────────────────
  const location = mapLocation(row);
  if (location) record.location = location;

  // ── Headline ──────────────────────────────────────────────────────────────
  const headline = pickFirst(row, ['headline', 'current_title', 'job_title', 'title']);
  if (headline) record.headline = headline;

  // ── Skills (raw string — normalizer will parse it later) ──────────────────
  const skillsRaw = pickFirst(row, ['skills', 'skill_set']);
  if (skillsRaw) {
    // Preserve the raw string as a single skill entry; the normalizer will split it
    record.skills = [{ name: skillsRaw }];
  }

  // ── Experience (current position from flat CSV columns) ───────────────────
  const experience = mapCurrentExperience(row);
  if (experience) record.experience = [experience];

  // ── Social links ──────────────────────────────────────────────────────────
  const socialLinks = mapSocialLinks(row);
  if (socialLinks.length > 0) record.socialLinks = socialLinks;

  return record;
}

// ---------------------------------------------------------------------------
// Field mappers — each is a pure function focused on one field group
// ---------------------------------------------------------------------------

function mapEmails(row: RawCsvRow): TaggedEmail[] {
  const emails: TaggedEmail[] = [];

  const primary = pickFirst(row, ['email', 'email_address', 'primary_email']);
  if (primary) emails.push({ address: primary, tag: 'work' });

  return emails;
}

function mapPhones(row: RawCsvRow): TaggedPhone[] {
  const phones: TaggedPhone[] = [];

  const mobile = pickFirst(row, ['mobile', 'mobile_number']);
  if (mobile) phones.push({ number: mobile, tag: 'mobile' });

  const work = pickFirst(row, ['phone', 'phone_number']);
  // Avoid duplicating if the same value was already captured as mobile
  if (work && work !== mobile) phones.push({ number: work, tag: 'work' });

  return phones;
}

function mapLocation(row: RawCsvRow): Location | undefined {
  const city = pickFirst(row, ['city']);
  const state = pickFirst(row, ['state']);
  const country = pickFirst(row, ['country']);
  const postalCode = pickFirst(row, ['postal_code', 'zip_code']);
  const raw = pickFirst(row, ['location']);

  if (!city && !state && !country && !postalCode && !raw) return undefined;

  return {
    ...(city && { city }),
    ...(state && { state }),
    ...(country && { country }),
    ...(postalCode && { postalCode }),
    ...(raw && { raw }),
  };
}

function mapCurrentExperience(row: RawCsvRow): WorkExperience | undefined {
  const company = pickFirst(row, ['company', 'current_company', 'employer']);
  const title = pickFirst(row, ['title', 'current_title', 'job_title']);

  if (!company && !title) return undefined;

  return {
    company: company ?? '',
    title: title ?? '',
    isCurrent: true,
  };
}

function mapSocialLinks(row: RawCsvRow): SocialLink[] {
  const links: SocialLink[] = [];

  const linkedin = pickFirst(row, ['linkedin_url', 'linkedin']);
  if (linkedin) links.push({ platform: 'linkedin', url: linkedin });

  const github = pickFirst(row, ['github_url', 'github']);
  if (github) links.push({ platform: 'github', url: github });

  const portfolio = pickFirst(row, ['portfolio_url', 'portfolio', 'website']);
  if (portfolio) links.push({ platform: 'portfolio', url: portfolio });

  const twitter = pickFirst(row, ['twitter_url', 'twitter']);
  if (twitter) links.push({ platform: 'twitter', url: twitter });

  return links;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Returns the first non-blank value from the given column aliases.
 * Columns are checked in order; the first hit wins.
 */
function pickFirst(
  row: RawCsvRow,
  aliases: ReadonlyArray<string>,
): string | undefined {
  for (const alias of aliases) {
    const value = row[alias];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}
