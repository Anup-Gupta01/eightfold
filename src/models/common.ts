// ---------------------------------------------------------------------------
// common.ts
// Shared value-object types used across the pipeline.
// No classes, no inheritance — plain interfaces and union literals only.
// ---------------------------------------------------------------------------

// ── Date ────────────────────────────────────────────────────────────────────

/** A partial date: at minimum a year is required. */
export interface PartialDate {
  year: number;
  month?: number; // 1–12
  day?: number;   // 1–31
}

// ── Contact primitives ───────────────────────────────────────────────────────

export type EmailTag = 'personal' | 'work' | 'other';
export type PhoneTag = 'mobile' | 'work' | 'home' | 'other';

export interface TaggedEmail {
  address: string;
  tag?: EmailTag;
}

export interface TaggedPhone {
  number: string;
  tag?: PhoneTag;
}

// ── Location ─────────────────────────────────────────────────────────────────

export interface Location {
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  /** Freeform string when structured parsing is not possible */
  raw?: string;
}

// ── Skill ────────────────────────────────────────────────────────────────────

export type SkillProficiency = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Skill {
  name: string;
  proficiency?: SkillProficiency;
  yearsOfExperience?: number;
}

// ── Work Experience ───────────────────────────────────────────────────────────

export interface WorkExperience {
  company: string;
  title: string;
  location?: string;
  startDate?: PartialDate;
  endDate?: PartialDate;
  isCurrent?: boolean;
  description?: string;
}

// ── Education ─────────────────────────────────────────────────────────────────

export interface Education {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: PartialDate;
  endDate?: PartialDate;
  gpa?: number;
}

// ── Social Links ─────────────────────────────────────────────────────────────

export type SocialPlatform =
  | 'linkedin'
  | 'github'
  | 'portfolio'
  | 'twitter'
  | 'other';

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}
