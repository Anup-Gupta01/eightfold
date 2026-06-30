// ---------------------------------------------------------------------------
// columns.ts
// Defines the canonical column contract for recruiter CSV files.
//
// Responsibilities:
//   - Enumerate known column names and their aliases
//   - Validate that a file's headers satisfy the minimum requirements
//
// Intentionally has no I/O or parsing logic.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Known column names (after header normalization: trim + lowercase + underscore)
// ---------------------------------------------------------------------------

/** All column names the pipeline recognises in recruiter CSVs. */
export const KNOWN_COLUMNS = [
  // Identity
  'first_name',
  'last_name',
  'full_name',
  'name',
  'candidate_name',

  // Contact
  'email',
  'email_address',
  'primary_email',
  'phone',
  'phone_number',
  'mobile',
  'mobile_number',

  // Location
  'city',
  'state',
  'country',
  'postal_code',
  'zip_code',
  'location',

  // Professional
  'headline',
  'current_title',
  'job_title',
  'summary',
  'bio',
  'about',

  // Current position
  'company',
  'current_company',
  'employer',
  'title',

  // Social / online
  'linkedin_url',
  'linkedin',
  'github_url',
  'github',
  'portfolio_url',
  'portfolio',
  'website',
  'twitter_url',
  'twitter',

  // Skills
  'skills',
  'skill_set',

  // Experience (serialised / freeform)
  'experience',
  'work_experience',

  // Education (serialised / freeform)
  'education',
  'school',
  'university',
  'degree',
  'field_of_study',
] as const;

export type KnownColumn = (typeof KNOWN_COLUMNS)[number];

// ---------------------------------------------------------------------------
// Minimum requirements: at least ONE column from each mandatory group must
// be present in the file's headers.
// ---------------------------------------------------------------------------

/**
 * Each group is an OR condition.
 * A file must satisfy ALL groups to be considered valid.
 */
export const REQUIRED_COLUMN_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  // Must have at least one name column
  ['first_name', 'last_name', 'full_name', 'name', 'candidate_name'],
  // Must have at least one contact column
  ['email', 'email_address', 'primary_email', 'phone', 'phone_number', 'mobile'],
];

// ---------------------------------------------------------------------------
// Header normalisation
// ---------------------------------------------------------------------------

/**
 * Transforms a raw header string into the canonical form used internally:
 * trimmed, lowercase, spaces/hyphens replaced with underscores.
 *
 * Examples:
 *   "First Name"  → "first_name"
 *   "Email Address" → "email_address"
 *   "LinkedIn-URL"  → "linkedin_url"
 */
export function normalizeHeaderName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, '_');
}

// ---------------------------------------------------------------------------
// Header validation
// ---------------------------------------------------------------------------

export interface HeaderValidationResult {
  valid: boolean;
  /** Normalised headers found in the file */
  headers: string[];
  /** Headers that match a known column name */
  recognised: string[];
  /** Headers not found in KNOWN_COLUMNS (pass-through — not an error) */
  unknown: string[];
  /** One message per unsatisfied REQUIRED_COLUMN_GROUP */
  missingGroups: string[];
}

/**
 * Validates the headers of a parsed CSV file.
 *
 * @param rawHeaders - The raw header strings from the CSV file (first row).
 * @returns A `HeaderValidationResult` describing what was found and what is missing.
 */
export function validateHeaders(rawHeaders: string[]): HeaderValidationResult {
  const headers = rawHeaders.map(normalizeHeaderName);
  const knownSet = new Set<string>(KNOWN_COLUMNS);

  const recognised = headers.filter((h) => knownSet.has(h));
  const unknown = headers.filter((h) => !knownSet.has(h));

  const missingGroups: string[] = [];

  for (const group of REQUIRED_COLUMN_GROUPS) {
    const satisfied = group.some((col) => headers.includes(col));
    if (!satisfied) {
      missingGroups.push(
        `Missing required column — expected at least one of: ${group.join(', ')}`,
      );
    }
  }

  return {
    valid: missingGroups.length === 0,
    headers,
    recognised,
    unknown,
    missingGroups,
  };
}
