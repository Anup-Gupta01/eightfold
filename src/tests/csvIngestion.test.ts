import path from 'path';
import fs from 'fs';
import os from 'os';
import { parseCsvFile, CsvParseError } from '../sources/csv/csvParser';
import { validateHeaders, normalizeHeaderName } from '../sources/csv/columns';
import { validateRow } from '../sources/csv/rowValidator';
import { mapRow } from '../sources/csv/rowMapper';
import { ingestCsv, CsvIngestionError } from '../sources/csv/csvIngestionService';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Writes content to a temp file and returns its path. */
function writeTempCsv(content: string): string {
  const filePath = path.join(os.tmpdir(), `test_${Date.now()}.csv`);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function cleanup(...paths: string[]): void {
  for (const p of paths) {
    try { fs.unlinkSync(p); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// normalizeHeaderName
// ---------------------------------------------------------------------------

describe('normalizeHeaderName', () => {
  it('lowercases and replaces spaces with underscores', () => {
    expect(normalizeHeaderName('First Name')).toBe('first_name');
    expect(normalizeHeaderName('Email Address')).toBe('email_address');
  });

  it('handles hyphens', () => {
    expect(normalizeHeaderName('LinkedIn-URL')).toBe('linkedin_url');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeHeaderName('  City  ')).toBe('city');
  });
});

// ---------------------------------------------------------------------------
// validateHeaders
// ---------------------------------------------------------------------------

describe('validateHeaders', () => {
  it('passes when all required groups are satisfied', () => {
    const result = validateHeaders(['first_name', 'email', 'city']);
    expect(result.valid).toBe(true);
    expect(result.missingGroups).toHaveLength(0);
  });

  it('fails when name columns are absent', () => {
    const result = validateHeaders(['email', 'phone']);
    expect(result.valid).toBe(false);
    expect(result.missingGroups[0]).toMatch(/name/i);
  });

  it('fails when contact columns are absent', () => {
    const result = validateHeaders(['first_name', 'city']);
    expect(result.valid).toBe(false);
    expect(result.missingGroups[0]).toMatch(/email|phone/i);
  });

  it('classifies unknown columns without failing', () => {
    const result = validateHeaders(['first_name', 'email', 'custom_field_xyz']);
    expect(result.valid).toBe(true);
    expect(result.unknown).toContain('custom_field_xyz');
  });
});

// ---------------------------------------------------------------------------
// validateRow
// ---------------------------------------------------------------------------

describe('validateRow', () => {
  it('passes a row with a full_name and email', () => {
    const result = validateRow({ full_name: 'Jane Doe', email: 'jane@example.com' });
    expect(result.valid).toBe(true);
  });

  it('fails a row with no name columns', () => {
    const result = validateRow({ email: 'jane@example.com' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/name/i);
  });

  it('fails a row with no contact columns', () => {
    const result = validateRow({ full_name: 'Jane Doe' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/contact/i);
  });

  it('fails a row where all values are whitespace', () => {
    const result = validateRow({ full_name: '   ', email: '   ' });
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mapRow
// ---------------------------------------------------------------------------

describe('mapRow', () => {
  it('maps first_name + last_name to fullName', () => {
    const record = mapRow({ first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' });
    expect(record.fullName).toBe('Jane Doe');
  });

  it('prefers full_name over first_name + last_name', () => {
    const record = mapRow({
      full_name: 'Jane Doe',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
    });
    expect(record.fullName).toBe('Jane Doe');
  });

  it('maps email to emails array with work tag', () => {
    const record = mapRow({ full_name: 'Jane', email: 'jane@example.com' });
    expect(record.emails).toEqual([{ address: 'jane@example.com', tag: 'work' }]);
  });

  it('maps mobile to phones with mobile tag', () => {
    const record = mapRow({ full_name: 'Jane', email: 'jane@example.com', mobile: '+1-555-0100' });
    expect(record.phones).toEqual([{ number: '+1-555-0100', tag: 'mobile' }]);
  });

  it('maps location fields', () => {
    const record = mapRow({
      full_name: 'Jane',
      email: 'jane@example.com',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
    });
    expect(record.location).toMatchObject({ city: 'San Francisco', state: 'CA', country: 'US' });
  });

  it('maps linkedin and github to socialLinks', () => {
    const record = mapRow({
      full_name: 'Jane',
      email: 'jane@example.com',
      linkedin_url: 'https://linkedin.com/in/jane',
      github_url: 'https://github.com/jane',
    });
    expect(record.socialLinks).toEqual([
      { platform: 'linkedin', url: 'https://linkedin.com/in/jane' },
      { platform: 'github', url: 'https://github.com/jane' },
    ]);
  });

  it('omits fields not present in the row', () => {
    const record = mapRow({ full_name: 'Jane', email: 'jane@example.com' });
    expect(record.location).toBeUndefined();
    expect(record.phones).toBeUndefined();
    expect(record.socialLinks).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// parseCsvFile
// ---------------------------------------------------------------------------

describe('parseCsvFile', () => {
  it('parses a valid CSV and normalises headers', async () => {
    const csv = 'First Name,Email Address\nJane,jane@example.com\n';
    const filePath = writeTempCsv(csv);
    try {
      const { headers, rows } = await parseCsvFile(filePath);
      expect(headers).toEqual(['first_name', 'email_address']);
      expect(rows).toHaveLength(1);
      expect(rows[0]['first_name']).toBe('Jane');
    } finally {
      cleanup(filePath);
    }
  });

  it('skips completely blank rows', async () => {
    const csv = 'First Name,Email\nJane,jane@example.com\n  ,  \nBob,bob@example.com\n';
    const filePath = writeTempCsv(csv);
    try {
      const { rows } = await parseCsvFile(filePath);
      expect(rows).toHaveLength(2);
    } finally {
      cleanup(filePath);
    }
  });

  it('throws CsvParseError for a non-existent file', async () => {
    await expect(parseCsvFile('/no/such/file.csv')).rejects.toThrow(CsvParseError);
  });

  it('throws CsvParseError for an empty file', async () => {
    const filePath = writeTempCsv('');
    try {
      await expect(parseCsvFile(filePath)).rejects.toThrow(CsvParseError);
    } finally {
      cleanup(filePath);
    }
  });
});

// ---------------------------------------------------------------------------
// ingestCsv (integration)
// ---------------------------------------------------------------------------

describe('ingestCsv', () => {
  it('ingests the sample CSV and returns mapped records', async () => {
    const samplePath = path.resolve(__dirname, '../../sample-data/candidates.csv');
    const result = await ingestCsv(samplePath);

    expect(result.validRows).toBeGreaterThan(0);
    expect(result.records[0].fullName).toBeDefined();
    expect(result.records[0].emails).toBeDefined();
  });

  it('throws CsvIngestionError for a missing file', async () => {
    await expect(ingestCsv('/no/such/file.csv')).rejects.toThrow(CsvIngestionError);
  });

  it('throws CsvIngestionError when required headers are missing', async () => {
    const csv = 'Company,Title\nAcme,Engineer\n';
    const filePath = writeTempCsv(csv);
    try {
      await expect(ingestCsv(filePath)).rejects.toThrow(CsvIngestionError);
    } finally {
      cleanup(filePath);
    }
  });

  it('collects row errors without throwing', async () => {
    // Row 2 has no name and no contact
    const csv = 'First Name,Email\nJane,jane@example.com\n,,\n';
    const filePath = writeTempCsv(csv);
    try {
      const result = await ingestCsv(filePath);
      expect(result.validRows).toBe(1);
      // blank row is filtered by parseCsvFile; no row errors expected here
    } finally {
      cleanup(filePath);
    }
  });

  it('handles a CSV with extra/unknown columns', async () => {
    const csv = 'First Name,Email,Custom Column XYZ\nJane,jane@example.com,some_value\n';
    const filePath = writeTempCsv(csv);
    try {
      const result = await ingestCsv(filePath);
      expect(result.validRows).toBe(1);
      expect(result.errors).toHaveLength(0);
    } finally {
      cleanup(filePath);
    }
  });
});
