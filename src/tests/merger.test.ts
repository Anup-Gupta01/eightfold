// ---------------------------------------------------------------------------
// merger.test.ts
// Unit & integration tests for the deterministic merger.
//
// Structure:
//   1. sourcePriority   — priority ranking
//   2. mergeText        — scalar field resolution
//   3. mergeLocation    — structured location merge
//   4. mergeArrays      — emails, phones, skills, experience, education, links
//   5. mergeCandidates  — full integration (pure function)
//   6. Merger class     — adapter (MergeInput → Candidate)
// ---------------------------------------------------------------------------

import { getPriority, SOURCE_PRIORITY, comparePriority } from '../merger/sourcePriority';
import { mergeTextField } from '../merger/mergeText';
import { mergeLocation }  from '../merger/mergeLocation';
import {
  mergeEmails,
  mergePhones,
  mergeSkills,
  mergeExperience,
  mergeEducation,
  mergeSocialLinks,
} from '../merger/mergeArrays';
import { mergeCandidates } from '../merger/mergeCandidates';
import { Merger } from '../merger/merger';
import type { SourcedRecord } from '../merger/mergeTypes';
import type { MergeSource } from '../merger/mergeCandidates';
import { makeProvenance } from '../models/provenance';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function csvProvenance(id = 'candidates.csv') {
  return makeProvenance('csv', id);
}

function resumeProvenance(id = 'resume.pdf') {
  return makeProvenance('resume', id);
}

/** Builds a SourcedRecord for use in helper-level tests. */
function sourced(
  record: SourcedRecord['record'],
  type: 'csv' | 'resume',
  id?: string,
): SourcedRecord {
  const prov = type === 'csv' ? csvProvenance(id) : resumeProvenance(id);
  return { record, priority: getPriority(type), provenance: prov };
}

/** Builds a MergeSource for use in mergeCandidates tests. */
function ms(record: SourcedRecord['record'], type: 'csv' | 'resume', id?: string): MergeSource {
  return {
    record,
    provenance: type === 'csv' ? csvProvenance(id) : resumeProvenance(id),
  };
}

// ===========================================================================
// 1. Source priority
// ===========================================================================

describe('SOURCE_PRIORITY', () => {
  it('CSV has higher priority (lower number) than resume', () => {
    expect(SOURCE_PRIORITY.csv).toBeLessThan(SOURCE_PRIORITY.resume);
  });

  it('getPriority returns the correct rank for csv', () => {
    expect(getPriority('csv')).toBe(1);
  });

  it('getPriority returns the correct rank for resume', () => {
    expect(getPriority('resume')).toBe(2);
  });
});

describe('comparePriority', () => {
  it('sorts csv before resume', () => {
    const a = sourced({}, 'csv');
    const b = sourced({}, 'resume');
    expect(comparePriority(a, b)).toBeLessThan(0);
  });

  it('breaks ties by sourceId lexicographically', () => {
    const a = sourced({}, 'csv', 'a.csv');
    const b = sourced({}, 'csv', 'b.csv');
    expect(comparePriority(a, b)).toBeLessThan(0);
  });
});

// ===========================================================================
// 2. mergeTextField
// ===========================================================================

describe('mergeTextField', () => {
  it('returns the CSV value when both sources provide the field', () => {
    const sources = [
      sourced({ fullName: 'CSV Name' }, 'csv'),
      sourced({ fullName: 'Resume Name' }, 'resume'),
    ];
    const result = mergeTextField(sources, 'fullName');
    expect(result.value).toBe('CSV Name');
    expect(result.trace?.reason).toBe('priority');
    expect(result.trace?.chosenFrom).toBe('candidates.csv');
  });

  it('falls back to the resume when CSV does not provide the field', () => {
    const sources = [
      sourced({}, 'csv'),
      sourced({ fullName: 'Resume Name' }, 'resume'),
    ];
    const result = mergeTextField(sources, 'fullName');
    expect(result.value).toBe('Resume Name');
    expect(result.trace?.reason).toBe('only-source');
  });

  it('prefers the longer value when two sources share the same priority', () => {
    const sources = [
      sourced({ fullName: 'J. Doe' }, 'csv', 'a.csv'),
      sourced({ fullName: 'Jane Doe' }, 'csv', 'b.csv'),
    ];
    const result = mergeTextField(sources, 'fullName');
    expect(result.value).toBe('Jane Doe');
    expect(result.trace?.reason).toBe('longer-value');
  });

  it('returns undefined when no source provides the field', () => {
    const sources = [sourced({}, 'csv'), sourced({}, 'resume')];
    const result = mergeTextField(sources, 'fullName');
    expect(result.value).toBeUndefined();
    expect(result.trace).toBeUndefined();
  });

  it('is deterministic on identical input', () => {
    const sources = [
      sourced({ fullName: 'Same' }, 'csv'),
      sourced({ fullName: 'Same' }, 'resume'),
    ];
    expect(mergeTextField(sources, 'fullName').value).toBe(
      mergeTextField(sources, 'fullName').value,
    );
  });
});

// ===========================================================================
// 3. mergeLocation
// ===========================================================================

describe('mergeLocation', () => {
  it('combines sub-fields from different sources', () => {
    const sources = [
      sourced({ location: { city: 'New York' } }, 'csv'),
      sourced({ location: { state: 'NY', country: 'US' } }, 'resume'),
    ];
    const loc = mergeLocation(sources);
    expect(loc?.city).toBe('New York');
    expect(loc?.state).toBe('NY');
    expect(loc?.country).toBe('US');
  });

  it('prefers the CSV value when both sources provide the same sub-field', () => {
    const sources = [
      sourced({ location: { city: 'NYC' } }, 'csv'),
      sourced({ location: { city: 'New York City' } }, 'resume'),
    ];
    const loc = mergeLocation(sources);
    expect(loc?.city).toBe('NYC');
  });

  it('returns undefined when no source provides a location', () => {
    const sources = [sourced({}, 'csv'), sourced({}, 'resume')];
    expect(mergeLocation(sources)).toBeUndefined();
  });
});

// ===========================================================================
// 4. mergeArrays
// ===========================================================================

describe('mergeEmails', () => {
  it('merges without duplicates', () => {
    const sources = [
      sourced({ emails: [{ address: 'jane@example.com', tag: 'work' }] }, 'csv'),
      sourced({ emails: [{ address: 'jane@example.com', tag: 'other' }] }, 'resume'),
    ];
    const result = mergeEmails(sources);
    expect(result).toHaveLength(1);
  });

  it('normalises address to lowercase', () => {
    const sources = [sourced({ emails: [{ address: 'JANE@EXAMPLE.COM' }] }, 'csv')];
    expect(mergeEmails(sources)[0].address).toBe('jane@example.com');
  });

  it('preserves both distinct addresses', () => {
    const sources = [
      sourced({ emails: [{ address: 'a@example.com' }] }, 'csv'),
      sourced({ emails: [{ address: 'b@example.com' }] }, 'resume'),
    ];
    expect(mergeEmails(sources)).toHaveLength(2);
  });

  it('uses the highest-priority source tag for a shared address', () => {
    const sources = [
      sourced({ emails: [{ address: 'jane@example.com', tag: 'work' }] }, 'csv'),
      sourced({ emails: [{ address: 'jane@example.com', tag: 'personal' }] }, 'resume'),
    ];
    expect(mergeEmails(sources)[0].tag).toBe('work');
  });
});

describe('mergePhones', () => {
  it('de-duplicates by digit-only key', () => {
    const sources = [
      sourced({ phones: [{ number: '+1-415-555-0100' }] }, 'csv'),
      sourced({ phones: [{ number: '14155550100' }] }, 'resume'),
    ];
    expect(mergePhones(sources)).toHaveLength(1);
  });

  it('keeps distinct numbers', () => {
    const sources = [
      sourced({ phones: [{ number: '+14155550100' }] }, 'csv'),
      sourced({ phones: [{ number: '+14155550199' }] }, 'resume'),
    ];
    expect(mergePhones(sources)).toHaveLength(2);
  });
});

describe('mergeSkills', () => {
  it('de-duplicates case-insensitively', () => {
    const sources = [
      sourced({ skills: [{ name: 'Python' }] }, 'csv'),
      sourced({ skills: [{ name: 'python' }] }, 'resume'),
    ];
    expect(mergeSkills(sources)).toHaveLength(1);
  });

  it('sorts alphabetically', () => {
    const sources = [
      sourced({ skills: [{ name: 'React' }, { name: 'Python' }] }, 'csv'),
    ];
    const result = mergeSkills(sources).map((s) => s.name);
    expect(result).toEqual([...result].sort((a, b) => a.localeCompare(b)));
  });

  it('keeps metadata from the first (highest-priority) source', () => {
    const sources = [
      sourced({ skills: [{ name: 'Python', proficiency: 'expert' }] }, 'csv'),
      sourced({ skills: [{ name: 'Python', proficiency: 'beginner' }] }, 'resume'),
    ];
    expect(mergeSkills(sources)[0].proficiency).toBe('expert');
  });
});

describe('mergeExperience', () => {
  const exp1 = { company: 'Acme', title: 'Engineer' };
  const exp2 = { company: 'Beta', title: 'Lead' };

  it('de-duplicates on company + title', () => {
    const sources = [
      sourced({ experience: [exp1] }, 'csv'),
      sourced({ experience: [exp1] }, 'resume'),
    ];
    expect(mergeExperience(sources)).toHaveLength(1);
  });

  it('keeps distinct entries', () => {
    const sources = [
      sourced({ experience: [exp1] }, 'csv'),
      sourced({ experience: [exp2] }, 'resume'),
    ];
    expect(mergeExperience(sources)).toHaveLength(2);
  });
});

describe('mergeEducation', () => {
  const edu1 = { institution: 'MIT', degree: 'B.S.' };
  const edu2 = { institution: 'Stanford', degree: 'M.S.' };

  it('de-duplicates on institution + degree', () => {
    const sources = [
      sourced({ education: [edu1] }, 'csv'),
      sourced({ education: [edu1] }, 'resume'),
    ];
    expect(mergeEducation(sources)).toHaveLength(1);
  });

  it('keeps distinct entries', () => {
    const sources = [
      sourced({ education: [edu1] }, 'csv'),
      sourced({ education: [edu2] }, 'resume'),
    ];
    expect(mergeEducation(sources)).toHaveLength(2);
  });
});

describe('mergeSocialLinks', () => {
  it('de-duplicates same platform + URL', () => {
    const link = { platform: 'linkedin' as const, url: 'https://linkedin.com/in/jane' };
    const sources = [
      sourced({ socialLinks: [link] }, 'csv'),
      sourced({ socialLinks: [link] }, 'resume'),
    ];
    expect(mergeSocialLinks(sources)).toHaveLength(1);
  });

  it('keeps distinct platforms', () => {
    const sources = [
      sourced({ socialLinks: [{ platform: 'linkedin' as const, url: 'https://linkedin.com/in/jane' }] }, 'csv'),
      sourced({ socialLinks: [{ platform: 'github' as const, url: 'https://github.com/jane' }] }, 'resume'),
    ];
    expect(mergeSocialLinks(sources)).toHaveLength(2);
  });
});

// ===========================================================================
// 5. mergeCandidates — full integration
// ===========================================================================

describe('mergeCandidates', () => {
  const csvSource = ms(
    {
      fullName: 'Jane Doe',
      emails:   [{ address: 'jane@acme.com', tag: 'work' }],
      phones:   [{ number: '+14155550100', tag: 'mobile' }],
      skills:   [{ name: 'Python' }],
      experience: [{ company: 'Acme Corp', title: 'Engineer' }],
      location: { city: 'San Francisco', state: 'CA' },
      socialLinks: [{ platform: 'linkedin', url: 'https://linkedin.com/in/jane' }],
    },
    'csv',
    'candidates.csv',
  );

  const resumeSource = ms(
    {
      fullName: 'Jane A. Doe',
      emails:   [{ address: 'jane.personal@gmail.com', tag: 'personal' }],
      phones:   [{ number: '+14155550199', tag: 'mobile' }],
      skills:   [{ name: 'JavaScript' }, { name: 'Python' }],
      education: [{ institution: 'MIT', degree: 'B.S.' }],
      location: { country: 'US' },
      socialLinks: [{ platform: 'github', url: 'https://github.com/jane' }],
    },
    'resume',
    'jane_resume.pdf',
  );

  it('returns a Candidate with a UUID candidateId', () => {
    const result = mergeCandidates([csvSource, resumeSource]);
    expect(result.candidateId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('prefers CSV fullName over resume fullName', () => {
    const result = mergeCandidates([csvSource, resumeSource]);
    expect(result.fullName).toBe('Jane Doe');
  });

  it('merges emails from both sources without duplicates', () => {
    const result = mergeCandidates([csvSource, resumeSource]);
    const addresses = result.emails.map((e) => e.address);
    expect(addresses).toContain('jane@acme.com');
    expect(addresses).toContain('jane.personal@gmail.com');
    expect(result.emails).toHaveLength(2);
  });

  it('merges phones from both sources', () => {
    const result = mergeCandidates([csvSource, resumeSource]);
    expect(result.phones).toHaveLength(2);
  });

  it('merges and deduplicates skills', () => {
    const result = mergeCandidates([csvSource, resumeSource]);
    const names = result.skills.map((s) => s.name);
    expect(names).toContain('Python');
    expect(names).toContain('JavaScript');
    // Python should appear only once
    expect(names.filter((n) => n === 'Python')).toHaveLength(1);
  });

  it('includes experience from CSV', () => {
    const result = mergeCandidates([csvSource, resumeSource]);
    expect(result.experience[0].company).toBe('Acme Corp');
  });

  it('includes education from resume (CSV had none)', () => {
    const result = mergeCandidates([csvSource, resumeSource]);
    expect(result.education[0].institution).toBe('MIT');
  });

  it('merges location sub-fields from both sources', () => {
    const result = mergeCandidates([csvSource, resumeSource]);
    expect(result.location?.city).toBe('San Francisco');
    expect(result.location?.country).toBe('US');
  });

  it('merges social links without duplicates', () => {
    const result = mergeCandidates([csvSource, resumeSource]);
    expect(result.socialLinks).toHaveLength(2);
  });

  it('collects provenance records from all sources', () => {
    const result = mergeCandidates([csvSource, resumeSource]);
    const ids = result.provenance.map((p) => p.sourceId);
    expect(ids).toContain('candidates.csv');
    expect(ids).toContain('jane_resume.pdf');
  });

  it('does not mutate the input records', () => {
    const csv = { fullName: 'Jane Doe', emails: [{ address: 'a@b.com' }] };
    const original = JSON.stringify(csv);
    mergeCandidates([ms(csv, 'csv')]);
    expect(JSON.stringify(csv)).toBe(original);
  });

  it('is deterministic — same input always produces same output (minus timestamps)', () => {
    const r1 = mergeCandidates([csvSource, resumeSource]);
    const r2 = mergeCandidates([csvSource, resumeSource]);
    // candidateId is random per call — compare data fields only
    expect(r1.fullName).toBe(r2.fullName);
    expect(r1.emails).toEqual(r2.emails);
    expect(r1.skills).toEqual(r2.skills);
  });

  it('reuses an existing candidateId when provided', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    const result = mergeCandidates([csvSource], id);
    expect(result.candidateId).toBe(id);
  });

  it('throws when given an empty sources array', () => {
    expect(() => mergeCandidates([])).toThrow();
  });

  it('works with a single CSV-only source', () => {
    const result = mergeCandidates([csvSource]);
    expect(result.fullName).toBe('Jane Doe');
    expect(result.provenance).toHaveLength(1);
  });

  it('works with a single resume-only source', () => {
    const result = mergeCandidates([resumeSource]);
    expect(result.fullName).toBe('Jane A. Doe');
  });
});

// ===========================================================================
// 6. Merger class (adapter)
// ===========================================================================

describe('Merger', () => {
  const merger = new Merger();

  it('merges csvRecord and resumeRecord', () => {
    const result = merger.merge({
      csvRecord:    { fullName: 'CSV Jane' },
      resumeRecord: { fullName: 'Resume Jane' },
    });
    expect(result.fullName).toBe('CSV Jane');
  });

  it('works with only a csvRecord', () => {
    const result = merger.merge({ csvRecord: { fullName: 'CSV Only' } });
    expect(result.fullName).toBe('CSV Only');
  });

  it('works with only a resumeRecord', () => {
    const result = merger.merge({ resumeRecord: { fullName: 'Resume Only' } });
    expect(result.fullName).toBe('Resume Only');
  });

  it('throws when no records are provided', () => {
    expect(() => merger.merge({})).toThrow();
  });

  it('attaches provenance when supplied', () => {
    const prov = makeProvenance('csv', 'test.csv');
    const result = merger.merge({
      csvRecord: { fullName: 'Jane' },
      csvProvenance: prov,
    });
    expect(result.provenance[0].sourceId).toBe('test.csv');
  });

  it('returns a Candidate with required pipeline fields', () => {
    const result = merger.merge({ csvRecord: { fullName: 'Jane' } });
    expect(result.candidateId).toBeDefined();
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
    expect(typeof result.overallConfidence).toBe('number');
  });
});
