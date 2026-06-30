import { normalizeEmail, normalizePhone, isNonEmptyString, toTrimmedString } from '../utils/helpers';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Jane.Doe@Example.COM  ')).toBe('jane.doe@example.com');
  });

  it('returns undefined for empty strings', () => {
    expect(normalizeEmail('')).toBeUndefined();
    expect(normalizeEmail('   ')).toBeUndefined();
  });

  it('returns undefined for non-strings', () => {
    expect(normalizeEmail(null)).toBeUndefined();
    expect(normalizeEmail(42)).toBeUndefined();
  });
});

describe('normalizePhone', () => {
  it('strips invalid characters', () => {
    expect(normalizePhone('+1 (555) 010-0100')).toBe('+1(555)010-0100');
  });

  it('returns undefined for empty values', () => {
    expect(normalizePhone('')).toBeUndefined();
  });
});

describe('isNonEmptyString', () => {
  it('returns true for non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
  });

  it('returns false for empty or whitespace strings', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('   ')).toBe(false);
  });

  it('returns false for non-strings', () => {
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(0)).toBe(false);
  });
});

describe('toTrimmedString', () => {
  it('trims whitespace', () => {
    expect(toTrimmedString('  hello  ')).toBe('hello');
  });

  it('returns undefined for blank strings', () => {
    expect(toTrimmedString('   ')).toBeUndefined();
  });
});
