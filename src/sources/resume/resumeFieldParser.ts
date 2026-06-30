// ---------------------------------------------------------------------------
// resumeFieldParser.ts
// Pure helper functions that extract individual fields from raw resume text.
//
// Rules:
//   - Each function accepts the raw text string and returns a typed value or
//     undefined when nothing can be found.
//   - Regular expressions are short and focused; each one is named.
//   - No AI APIs, no NLP libraries.
// ---------------------------------------------------------------------------

import type {
  TaggedEmail,
  TaggedPhone,
  Skill,
  Education,
  WorkExperience,
  PartialDate,
  SocialLink,
} from '../../models/common';

// ---------------------------------------------------------------------------
// Name
// ---------------------------------------------------------------------------

/**
 * Attempts to extract the candidate's full name from the first non-blank line
 * of the resume text.
 *
 * Strategy: the topmost meaningful line is usually the name on a resume.
 * We accept it if it contains 2–4 capitalised "words" (no digits, no symbols).
 */
export function extractName(text: string): string | undefined {
  const nameLinePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/;

  for (const line of splitLines(text)) {
    const trimmed = line.trim();
    if (trimmed && nameLinePattern.test(trimmed)) {
      return trimmed;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

/**
 * Finds all e-mail addresses in the text and returns them as `TaggedEmail[]`.
 * Duplicates (case-insensitive) are removed.
 */
export function extractEmails(text: string): TaggedEmail[] {
  const matches = text.match(EMAIL_PATTERN) ?? [];
  const seen = new Set<string>();
  const result: TaggedEmail[] = [];

  for (const address of matches) {
    const normalised = address.toLowerCase();
    if (!seen.has(normalised)) {
      seen.add(normalised);
      result.push({ address, tag: 'other' });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

/**
 * Matches common phone number formats:
 *   +1-800-555-0100 | (800) 555-0100 | 800.555.0100 | 8005550100
 * Requires at least 7 digits in the match.
 */
const PHONE_PATTERN =
  /(?:\+?\d{1,3}[\s\-.])?(?:\(?\d{3}\)?[\s\-.])\d{3}[\s\-.]\d{4}/g;

/**
 * Finds all phone numbers in the text and returns them as `TaggedPhone[]`.
 * Duplicates (normalised to digits only) are removed.
 */
export function extractPhones(text: string): TaggedPhone[] {
  const matches = text.match(PHONE_PATTERN) ?? [];
  const seen = new Set<string>();
  const result: TaggedPhone[] = [];

  for (const number of matches) {
    const key = number.replace(/\D/g, '');
    if (key.length >= 7 && !seen.has(key)) {
      seen.add(key);
      result.push({ number: number.trim(), tag: 'other' });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

/**
 * Extracts skills listed beneath a "Skills" section heading.
 *
 * Accepts comma-separated, bullet-separated, or pipe-separated lists,
 * as well as one skill per line.
 */
export function extractSkills(text: string): Skill[] {
  const section = extractSection(text, /skills?/i);
  if (!section) return [];

  // Split on common delimiters: comma, bullet, pipe, newline
  const raw = section.split(/[,\|\n•·▪\-]+/);

  return raw
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 60) // discard garbage lines
    .map((name) => ({ name }));
}

// ---------------------------------------------------------------------------
// Education
// ---------------------------------------------------------------------------

/**
 * Degree keywords used to identify education entries.
 */
const DEGREE_PATTERN =
  /\b(B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|Ph\.?D\.?|Bachelor|Master|Associate|MBA|B\.?Tech|M\.?Tech|B\.?E\.?|M\.?E\.?)\b/i;

/**
 * Extracts education entries from the "Education" section.
 * Each non-blank line that is NOT a year range is treated as the institution name;
 * degree information is pulled from the same block when a degree keyword appears.
 */
export function extractEducation(text: string): Education[] {
  const section = extractSection(text, /education/i);
  if (!section) return [];

  const entries: Education[] = [];
  const blocks = splitIntoBlocks(section);

  for (const block of blocks) {
    const institution = findInstitutionLine(block);
    if (!institution) continue;

    const degreeMatch = block.match(DEGREE_PATTERN);
    const dates = extractDateRange(block);

    const entry: Education = {
      institution,
      ...(degreeMatch && { degree: degreeMatch[0] }),
      ...(dates.start && { startDate: dates.start }),
      ...(dates.end && { endDate: dates.end }),
    };

    entries.push(entry);
  }

  return entries;
}

/** Picks the first substantial non-date line from an education block. */
function findInstitutionLine(block: string): string | undefined {
  for (const line of splitLines(block)) {
    const trimmed = line.trim();
    if (trimmed.length > 3 && !/^\d{4}/.test(trimmed)) {
      return trimmed;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Work Experience
// ---------------------------------------------------------------------------

/**
 * Extracts work experience entries from the "Experience" / "Work History" section.
 */
export function extractExperience(text: string): WorkExperience[] {
  const section = extractSection(text, /(?:work\s+)?experience|work\s+history|employment/i);
  if (!section) return [];

  const entries: WorkExperience[] = [];
  const blocks = splitIntoBlocks(section);

  for (const block of blocks) {
    const entry = parseExperienceBlock(block);
    if (entry) entries.push(entry);
  }

  return entries;
}

/**
 * Parses a single experience block into a `WorkExperience`.
 * Line 1 is assumed to be the job title or company; subsequent lines provide context.
 */
function parseExperienceBlock(block: string): WorkExperience | undefined {
  const lines = splitLines(block).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return undefined;

  // First non-blank line is typically the title or company
  const firstLine = lines[0];
  // If a separator like " at " or " | " is present, split title / company
  const atSplit = firstLine.split(/\s+(?:at|@|–|\|)\s+/i);

  let title = atSplit[0].trim();
  let company = atSplit[1]?.trim() ?? '';

  // Fallback: second line may be the company
  if (!company && lines[1] && !DEGREE_PATTERN.test(lines[1])) {
    company = lines[1].trim();
  }

  if (!title && !company) return undefined;

  const dates = extractDateRange(block);
  const isCurrent = /present|current|now/i.test(block);

  // Collect remaining lines as description (skip date-only lines)
  const descLines = lines.slice(2).filter((l) => !/^\d{4}/.test(l));
  const description = descLines.join(' ').trim() || undefined;

  return {
    title,
    company,
    ...(dates.start && { startDate: dates.start }),
    ...(dates.end && !isCurrent && { endDate: dates.end }),
    ...(isCurrent && { isCurrent: true }),
    ...(description && { description }),
  };
}

// ---------------------------------------------------------------------------
// Social Links
// ---------------------------------------------------------------------------

const LINKEDIN_PATTERN = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w\-]+\/?/gi;
const GITHUB_PATTERN   = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w\-]+\/?/gi;
const PORTFOLIO_PATTERN = /https?:\/\/(?!linkedin|github)[\w\-.]+\.\w{2,}(?:\/[\w\-./?%&=]*)?/gi;

/**
 * Extracts LinkedIn, GitHub, and portfolio links from the text.
 */
export function extractSocialLinks(text: string): SocialLink[] {
  const links: SocialLink[] = [];

  for (const url of text.match(LINKEDIN_PATTERN) ?? []) {
    links.push({ platform: 'linkedin', url: url.trim() });
  }

  for (const url of text.match(GITHUB_PATTERN) ?? []) {
    links.push({ platform: 'github', url: url.trim() });
  }

  for (const url of text.match(PORTFOLIO_PATTERN) ?? []) {
    // Avoid double-capturing LinkedIn/GitHub already matched above
    const lower = url.toLowerCase();
    if (!lower.includes('linkedin') && !lower.includes('github')) {
      links.push({ platform: 'portfolio', url: url.trim() });
    }
  }

  return links;
}

// ---------------------------------------------------------------------------
// Section extraction utilities
// ---------------------------------------------------------------------------

/**
 * Finds and returns the text that follows a section heading until the next
 * recognised section heading (or end of document).
 *
 * @param text    - Full resume text.
 * @param heading - Regex that matches the section title.
 */
export function extractSection(text: string, heading: RegExp): string | undefined {
  // A section heading is a line that matches `heading` and is likely ALL-CAPS
  // or ends with a colon, or is followed by a separator line.
  const lines = splitLines(text);

  // Known section headings — used to detect when the current section ends.
  const sectionHeadings =
    /^(?:skills?|education|experience|employment|work\s+history|projects?|certifications?|summary|objective|contact|profile|languages?|awards?|publications?|references?)/i;

  let inSection = false;
  const collected: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (heading.test(trimmed) && isHeadingLine(trimmed)) {
      inSection = true;
      continue;
    }

    if (inSection) {
      // Stop at the next section heading
      if (trimmed && sectionHeadings.test(trimmed) && isHeadingLine(trimmed)) {
        break;
      }
      collected.push(line);
    }
  }

  const result = collected.join('\n').trim();
  return result.length > 0 ? result : undefined;
}

/** Heuristic: a line is a heading if it is short, has no full-stop at the end,
 *  and is either all-caps, title-cased, or ends with a colon. */
function isHeadingLine(line: string): boolean {
  if (line.length > 60) return false;
  if (/[A-Z]{2,}/.test(line)) return true;    // ALL-CAPS word
  if (line.endsWith(':')) return true;
  if (/^[A-Z]/.test(line) && !/[.!?]$/.test(line)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Date range helper
// ---------------------------------------------------------------------------

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DATE_RANGE_PATTERN =
  /(?:([A-Za-z]+)[\s.,]+)?(\d{4})\s*(?:–|-|to)\s*(?:([A-Za-z]+)[\s.,]+)?(\d{4}|present|current|now)/gi;

/**
 * Finds the first date range (e.g. "Jan 2020 – Dec 2022" or "2019 – present")
 * in a block of text and returns parsed start/end dates.
 */
export function extractDateRange(text: string): {
  start?: PartialDate;
  end?: PartialDate;
} {
  DATE_RANGE_PATTERN.lastIndex = 0; // reset stateful regex
  const match = DATE_RANGE_PATTERN.exec(text);
  if (!match) return {};

  const [, startMonth, startYear, endMonth, endYearRaw] = match;

  const start: PartialDate = { year: parseInt(startYear, 10) };
  if (startMonth) {
    const m = MONTH_MAP[startMonth.slice(0, 3).toLowerCase()];
    if (m) start.month = m;
  }

  const isPresent = /present|current|now/i.test(endYearRaw);
  const end: PartialDate | undefined = isPresent
    ? undefined
    : { year: parseInt(endYearRaw, 10) };

  if (end && endMonth) {
    const m = MONTH_MAP[endMonth.slice(0, 3).toLowerCase()];
    if (m) end.month = m;
  }

  return { start, ...(end && { end }) };
}

// ---------------------------------------------------------------------------
// String utilities
// ---------------------------------------------------------------------------

/** Splits a string into lines, preserving empty lines. */
function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

/**
 * Splits a section body into "blocks" — separated by one or more blank lines.
 * Each block typically corresponds to one entry (job, degree, etc.).
 */
function splitIntoBlocks(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
}
