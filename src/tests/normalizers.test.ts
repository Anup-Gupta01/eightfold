// ---------------------------------------------------------------------------
// normalizers.test.ts
// Unit tests for the four normalizer utility modules.
//
// Covers:
//   1. normalizeEmails    — trim, lowercase, deduplicate
//   2. normalizePhones    — E.164 conversion, deduplication
//   3. normalizePartialDate / normalizeDateString — YYYY-MM-DD output
//   4. normalizeSkills    — alias resolution, deduplication, sorting
//   5. resolveSkillAlias  — single-item alias lookup
// ---------------------------------------------------------------------------

import { normalizeEmails, normalizeEmailAddress } from '../normalizers/utils/normalizeEmail';
import { normalizePhones, toE164 }                from '../normalizers/utils/normalizePhone';
import { normalizePartialDate, normalizeDateString } from '../normalizers/utils/normalizeDate';
import { normalizeSkills, resolveSkillAlias }     from '../normalizers/utils/normalizeSkill';

// ===========================================================================
// 1. Email normalization
// ===========================================================================

describe('normalizeEmailAddress', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeEmailAddress('  jane@example.com  ')).toBe('jane@example.com');
  });

  it('converts to lowercase', () => {
    expect(normalizeEmailAddress('Jane.DOE@Example.COM')).toBe('jane.doe@example.com');
  });

  it('returns undefined for a blank string', () => {
    expect(normalizeEmailAddress('')).toBeUndefined();
    expect(normalizeEmailAddress('   ')).toBeUndefined();
  });
});

describe('normalizeEmails', () => {
  it('trims and lowercases each address', () => {
    const result = normalizeEmails([{ address: '  JANE@EXAMPLE.COM  ', tag: 'work' }]);
    expect(result[0].address).toBe('jane@example.com');
  });

  it('removes duplicate addresses (case-insensitive)', () => {
    const result = normalizeEmails([
      { address: 'jane@example.com' },
      { address: 'JANE@EXAMPLE.COM' },
      { address: 'jane@example.com' },
    ]);
    expect(result).toHaveLength(1);
  });

  it('preserves the tag of the first occurrence', () => {
    const result = normalizeEmails([
      { address: 'jane@example.com', tag: 'work' },
      { address: 'JANE@EXAMPLE.COM', tag: 'personal' },
    ]);
    expect(result[0].tag).toBe('work');
  });

  it('drops entries with blank addresses', () => {
    const result = normalizeEmails([
      { address: '' },
      { address: '   ' },
      { address: 'valid@example.com' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe('valid@example.com');
  });

  it('preserves order of first-seen distinct addresses', () => {
    const result = normalizeEmails([
      { address: 'a@example.com' },
      { address: 'b@example.com' },
    ]);
    expect(result[0].address).toBe('a@example.com');
    expect(result[1].address).toBe('b@example.com');
  });

  it('returns an empty array for an empty input', () => {
    expect(normalizeEmails([])).toEqual([]);
  });
});

// ===========================================================================
// 2. Phone normalization
// ===========================================================================

describe('toE164', () => {
  it('converts a 10-digit number to E.164 with default +1', () => {
    expect(toE164('4155550100')).toBe('+14155550100');
  });

  it('handles +1 prefix already present', () => {
    expect(toE164('+14155550100')).toBe('+14155550100');
  });

  it('strips hyphens, spaces, and parentheses', () => {
    expect(toE164('(415) 555-0100')).toBe('+14155550100');
  });

  it('strips dots', () => {
    expect(toE164('415.555.0100')).toBe('+14155550100');
  });

  it('accepts a custom country code', () => {
    // UK local format: strip leading '0', prepend country code '44'
    expect(toE164('07911123456', '44')).toBe('+447911123456');
  });

  it('returns undefined for a number with fewer than 7 digits', () => {
    expect(toE164('123')).toBeUndefined();
  });

  it('returns undefined for a blank string', () => {
    expect(toE164('')).toBeUndefined();
  });

  it('handles 11-digit number starting with 1 (no + prefix)', () => {
    expect(toE164('14155550100')).toBe('+14155550100');
  });
});

describe('normalizePhones', () => {
  it('normalizes a list to E.164', () => {
    const result = normalizePhones([{ number: '(415) 555-0100', tag: 'mobile' }]);
    expect(result[0].number).toBe('+14155550100');
  });

  it('deduplicates numbers that resolve to the same digits', () => {
    const result = normalizePhones([
      { number: '4155550100' },
      { number: '(415) 555-0100' },
      { number: '+1-415-555-0100' },
    ]);
    expect(result).toHaveLength(1);
  });

  it('preserves the tag of the first occurrence', () => {
    const result = normalizePhones([
      { number: '4155550100', tag: 'mobile' },
      { number: '(415) 555-0100', tag: 'work' },
    ]);
    expect(result[0].tag).toBe('mobile');
  });

  it('drops entries that cannot be parsed', () => {
    const result = normalizePhones([{ number: 'not-a-number' }]);
    expect(result).toHaveLength(0);
  });

  it('returns an empty array for empty input', () => {
    expect(normalizePhones([])).toEqual([]);
  });
});

// ===========================================================================
// 3. Date normalization
// ===========================================================================

describe('normalizePartialDate', () => {
  it('returns YYYY for year-only', () => {
    expect(normalizePartialDate({ year: 2023 })).toBe('2023');
  });

  it('returns YYYY-MM for year + month', () => {
    expect(normalizePartialDate({ year: 2023, month: 6 })).toBe('2023-06');
  });

  it('returns YYYY-MM-DD for full date', () => {
    expect(normalizePartialDate({ year: 2023, month: 6, day: 15 })).toBe('2023-06-15');
  });

  it('zero-pads single-digit month and day', () => {
    expect(normalizePartialDate({ year: 2023, month: 1, day: 5 })).toBe('2023-01-05');
  });
});

describe('normalizeDateString', () => {
  it('passes through an already-ISO string', () => {
    expect(normalizeDateString('2023-06-15')).toBe('2023-06-15');
  });

  it('passes through a YYYY-MM string', () => {
    expect(normalizeDateString('2023-06')).toBe('2023-06');
  });

  it('passes through a year-only string', () => {
    expect(normalizeDateString('2023')).toBe('2023');
  });

  it('parses "Month YYYY" format', () => {
    expect(normalizeDateString('June 2023')).toBe('2023-06');
    expect(normalizeDateString('Jan 2020')).toBe('2020-01');
  });

  it('parses "Month, YYYY" format', () => {
    expect(normalizeDateString('June, 2023')).toBe('2023-06');
  });

  it('parses DD/MM/YYYY when day > 12', () => {
    expect(normalizeDateString('15/06/2023')).toBe('2023-06-15');
  });

  it('parses MM/DD/YYYY when first part ≤ 12', () => {
    // treated as MM-DD-YYYY (North American convention)
    expect(normalizeDateString('06/15/2023')).toBe('2023-06-15');
  });

  it('parses MM-DD-YYYY', () => {
    expect(normalizeDateString('06-15-2023')).toBe('2023-06-15');
  });

  it('parses "DD Month YYYY"', () => {
    expect(normalizeDateString('15 June 2023')).toBe('2023-06-15');
  });

  it('returns undefined for unrecognised formats', () => {
    expect(normalizeDateString('not a date')).toBeUndefined();
    expect(normalizeDateString('')).toBeUndefined();
  });
});

// ===========================================================================
// 4. Skill normalization
// ===========================================================================

describe('resolveSkillAlias', () => {
  it('resolves "JS" to "JavaScript"', () => {
    expect(resolveSkillAlias('JS')).toBe('JavaScript');
  });

  it('resolves "Javascript" (mixed case) to "JavaScript"', () => {
    expect(resolveSkillAlias('Javascript')).toBe('JavaScript');
  });

  it('resolves "NodeJS" to "Node.js"', () => {
    expect(resolveSkillAlias('NodeJS')).toBe('Node.js');
  });

  it('resolves "ReactJS" to "React"', () => {
    expect(resolveSkillAlias('ReactJS')).toBe('React');
  });

  it('resolves "C Plus Plus" to "C++"', () => {
    expect(resolveSkillAlias('C Plus Plus')).toBe('C++');
  });

  it('returns the original name when no alias is found', () => {
    expect(resolveSkillAlias('SomeObscureLib')).toBe('SomeObscureLib');
  });

  it('respects a custom alias map merged on top of defaults', () => {
    expect(resolveSkillAlias('mylib', { mylib: 'MyLibrary' })).toBe('MyLibrary');
  });

  it('custom alias overrides a default mapping', () => {
    // Override "go" to point to a custom value
    expect(resolveSkillAlias('go', { go: 'Go (Golang)' })).toBe('Go (Golang)');
  });
});

describe('normalizeSkills', () => {
  it('resolves aliases in a list', () => {
    const result = normalizeSkills([{ name: 'JS' }, { name: 'NodeJS' }]);
    expect(result.map((s) => s.name)).toContain('JavaScript');
    expect(result.map((s) => s.name)).toContain('Node.js');
  });

  it('deduplicates skills that resolve to the same canonical name', () => {
    const result = normalizeSkills([
      { name: 'JS' },
      { name: 'JavaScript' },
      { name: 'javascript' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('JavaScript');
  });

  it('sorts the result alphabetically', () => {
    const result = normalizeSkills([
      { name: 'Python' },
      { name: 'Go' },
      { name: 'JS' },
    ]);
    const names = result.map((s) => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('drops skills with blank names', () => {
    const result = normalizeSkills([{ name: '  ' }, { name: 'Python' }]);
    expect(result).toHaveLength(1);
  });

  it('preserves proficiency and yearsOfExperience from the first occurrence', () => {
    const result = normalizeSkills([
      { name: 'JS', proficiency: 'expert', yearsOfExperience: 5 },
      { name: 'JavaScript' },
    ]);
    expect(result[0].proficiency).toBe('expert');
    expect(result[0].yearsOfExperience).toBe(5);
  });

  it('accepts custom aliases merged over defaults', () => {
    const result = normalizeSkills(
      [{ name: 'mylib' }, { name: 'JS' }],
      { mylib: 'MyLibrary' },
    );
    expect(result.map((s) => s.name)).toContain('MyLibrary');
    expect(result.map((s) => s.name)).toContain('JavaScript');
  });

  it('returns an empty array for empty input', () => {
    expect(normalizeSkills([])).toEqual([]);
  });
});
