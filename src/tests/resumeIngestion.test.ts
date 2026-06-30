// ---------------------------------------------------------------------------
// resumeIngestion.test.ts
// Unit & integration tests for the resume PDF ingestion pipeline.
//
// Structure:
//   1. resumeFieldParser  — unit tests for each extraction helper
//   2. resumeNormalizer   — unit test for the assembler
//   3. textExtractor      — tests with pdf-parse mocked
//   4. ResumeParser       — tests with pdf-parse mocked
//   5. ingestResume       — integration tests with pdf-parse mocked
// ---------------------------------------------------------------------------

// Mock pdf-parse before any imports so the module loader picks up the mock.
jest.mock('pdf-parse', () =>
  jest.fn().mockResolvedValue({ text: '', numpages: 1 }),
);

import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  extractName,
  extractEmails,
  extractPhones,
  extractSkills,
  extractEducation,
  extractExperience,
  extractSocialLinks,
  extractSection,
  extractDateRange,
} from '../sources/resume/resumeFieldParser';

import { normalizeResumeData } from '../sources/resume/resumeNormalizer';
import { extractTextFromPdf, ResumeExtractError } from '../sources/resume/textExtractor';
import { ResumeParser } from '../sources/resume/resumeParser';
import { ingestResume, ResumeIngestionError } from '../sources/resume/resumeIngestionService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;

/** Sets the text that pdf-parse will "return" for the next call. */
function setPdfText(text: string, pages = 1): void {
  mockPdfParse.mockResolvedValueOnce({ text, numpages: pages } as never);
}

/** Writes a dummy (non-PDF) temp file and returns its path. */
function writeTempFile(content: string, ext = '.pdf'): string {
  const filePath = path.join(os.tmpdir(), `test_resume_${Date.now()}${ext}`);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function cleanup(...paths: string[]): void {
  for (const p of paths) {
    try { fs.unlinkSync(p); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Sample resume text used across tests
// ---------------------------------------------------------------------------

const SAMPLE_RESUME = `
Jane Smith
jane.smith@example.com  |  +1-800-555-0199
https://linkedin.com/in/janesmith  |  https://github.com/janesmith

SKILLS
JavaScript, TypeScript, Node.js, React, PostgreSQL, Docker

EDUCATION
Massachusetts Institute of Technology
B.S. Computer Science
2015 – 2019

EXPERIENCE
Senior Software Engineer at Acme Corp
Jan 2021 – present
Led a team of 5 engineers building microservices in Node.js.

Software Engineer at Beta Inc
Jun 2019 – Dec 2020
Developed REST APIs and frontend components.
`.trim();

// ===========================================================================
// 1. resumeFieldParser — unit tests
// ===========================================================================

describe('extractName', () => {
  it('extracts a two-word capitalised name from the first line', () => {
    expect(extractName('Jane Smith\njane@example.com')).toBe('Jane Smith');
  });

  it('extracts a three-word name', () => {
    expect(extractName('Mary Anne Johnson\nsome other text')).toBe('Mary Anne Johnson');
  });

  it('returns undefined when the first line contains digits', () => {
    expect(extractName('42 Street\njane@example.com')).toBeUndefined();
  });

  it('returns undefined for an email-only string', () => {
    expect(extractName('jane@example.com')).toBeUndefined();
  });
});

describe('extractEmails', () => {
  it('extracts a single email address', () => {
    const result = extractEmails('Contact me at jane@example.com for details.');
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe('jane@example.com');
  });

  it('extracts multiple distinct email addresses', () => {
    const result = extractEmails('jane@example.com  bob@work.org');
    expect(result).toHaveLength(2);
  });

  it('de-duplicates case-insensitive addresses', () => {
    const result = extractEmails('Jane@Example.COM  jane@example.com');
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no email is present', () => {
    expect(extractEmails('No contact info here.')).toHaveLength(0);
  });
});

describe('extractPhones', () => {
  it('extracts a standard US phone number', () => {
    const result = extractPhones('Call me at +1-800-555-0199.');
    expect(result).toHaveLength(1);
    expect(result[0].number).toContain('800');
  });

  it('handles parenthesised area code format', () => {
    const result = extractPhones('Phone: (415) 555-0100');
    expect(result).toHaveLength(1);
  });

  it('de-duplicates identical numbers', () => {
    const result = extractPhones('+1-800-555-0199 and 1-800-555-0199');
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no phone is present', () => {
    expect(extractPhones('No phone info.')).toHaveLength(0);
  });
});

describe('extractSkills', () => {
  it('parses a comma-separated skills list', () => {
    const text = 'SKILLS\nJavaScript, TypeScript, React\n\nEDUCATION';
    const skills = extractSkills(text);
    expect(skills.map((s) => s.name)).toEqual(
      expect.arrayContaining(['JavaScript', 'TypeScript', 'React']),
    );
  });

  it('returns empty array when there is no skills section', () => {
    expect(extractSkills('No relevant sections here.')).toHaveLength(0);
  });
});

describe('extractEducation', () => {
  const text = `
EDUCATION

Massachusetts Institute of Technology
B.S. Computer Science
2015 – 2019

EXPERIENCE
`;

  it('extracts the institution name', () => {
    const result = extractEducation(text);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].institution).toContain('Massachusetts');
  });

  it('extracts the degree when a degree keyword is present', () => {
    const result = extractEducation(text);
    expect(result[0].degree).toMatch(/B\.?S\.?/i);
  });

  it('extracts the start year', () => {
    const result = extractEducation(text);
    expect(result[0].startDate?.year).toBe(2015);
  });

  it('returns empty array when there is no education section', () => {
    expect(extractEducation('No relevant sections.')).toHaveLength(0);
  });
});

describe('extractExperience', () => {
  const text = `
EXPERIENCE

Senior Software Engineer at Acme Corp
Jan 2021 – present
Led a team of 5 engineers.

Software Engineer at Beta Inc
Jun 2019 – Dec 2020
Developed REST APIs.

EDUCATION
`;

  it('extracts the job title', () => {
    const result = extractExperience(text);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title).toContain('Senior Software Engineer');
  });

  it('extracts the company from "at" separator', () => {
    const result = extractExperience(text);
    expect(result[0].company).toBe('Acme Corp');
  });

  it('marks the current role as isCurrent', () => {
    const result = extractExperience(text);
    expect(result[0].isCurrent).toBe(true);
  });

  it('extracts start date from past role', () => {
    const result = extractExperience(text);
    expect(result[1]?.startDate?.year).toBe(2019);
  });

  it('returns empty array when there is no experience section', () => {
    expect(extractExperience('No relevant sections.')).toHaveLength(0);
  });
});

describe('extractSocialLinks', () => {
  it('extracts a LinkedIn URL', () => {
    const result = extractSocialLinks('https://linkedin.com/in/janesmith');
    expect(result.find((l) => l.platform === 'linkedin')).toBeDefined();
  });

  it('extracts a GitHub URL', () => {
    const result = extractSocialLinks('https://github.com/janesmith');
    expect(result.find((l) => l.platform === 'github')).toBeDefined();
  });

  it('extracts a portfolio URL', () => {
    const result = extractSocialLinks('Visit https://janesmith.dev for my work.');
    expect(result.find((l) => l.platform === 'portfolio')).toBeDefined();
  });

  it('returns empty array when no URLs present', () => {
    expect(extractSocialLinks('No URLs here.')).toHaveLength(0);
  });
});

describe('extractSection', () => {
  it('returns the content between two section headings', () => {
    const text = 'Skills\nJavaScript\nPython\nEducation\nMIT\n';
    const section = extractSection(text, /skills?/i);
    expect(section).toContain('JavaScript');
    expect(section).not.toContain('MIT');
  });

  it('returns undefined when the heading is not found', () => {
    expect(extractSection('Only random text', /skills?/i)).toBeUndefined();
  });
});

describe('extractDateRange', () => {
  it('parses a year-only range', () => {
    const { start, end } = extractDateRange('2015 – 2019');
    expect(start?.year).toBe(2015);
    expect(end?.year).toBe(2019);
  });

  it('parses a month-year range', () => {
    const { start, end } = extractDateRange('Jan 2021 – Dec 2022');
    expect(start?.month).toBe(1);
    expect(end?.month).toBe(12);
  });

  it('returns no end date for "present"', () => {
    const { start, end } = extractDateRange('Jan 2021 – present');
    expect(start?.year).toBe(2021);
    expect(end).toBeUndefined();
  });

  it('returns empty object when no date range found', () => {
    const result = extractDateRange('No dates here.');
    expect(result.start).toBeUndefined();
    expect(result.end).toBeUndefined();
  });
});

// ===========================================================================
// 2. resumeNormalizer — unit tests
// ===========================================================================

describe('normalizeResumeData', () => {
  const raw = { text: SAMPLE_RESUME, numPages: 1, origin: '/fake/resume.pdf' };

  it('populates fullName', () => {
    const record = normalizeResumeData(raw);
    expect(record.fullName).toBe('Jane Smith');
  });

  it('populates emails array', () => {
    const record = normalizeResumeData(raw);
    expect(record.emails?.length).toBeGreaterThan(0);
    expect(record.emails?.[0].address).toBe('jane.smith@example.com');
  });

  it('populates phones array', () => {
    const record = normalizeResumeData(raw);
    expect(record.phones?.length).toBeGreaterThan(0);
  });

  it('populates skills array', () => {
    const record = normalizeResumeData(raw);
    expect(record.skills?.length).toBeGreaterThan(0);
  });

  it('populates education array', () => {
    const record = normalizeResumeData(raw);
    expect(record.education?.length).toBeGreaterThan(0);
  });

  it('populates experience array', () => {
    const record = normalizeResumeData(raw);
    expect(record.experience?.length).toBeGreaterThan(0);
  });

  it('populates socialLinks', () => {
    const record = normalizeResumeData(raw);
    expect(record.socialLinks?.length).toBeGreaterThan(0);
  });

  it('returns an empty object for completely empty text', () => {
    const record = normalizeResumeData({ text: '', numPages: 0, origin: '/empty.pdf' });
    expect(Object.keys(record)).toHaveLength(0);
  });

  it('leaves undefined fields absent (not null)', () => {
    const record = normalizeResumeData({ text: '', numPages: 0, origin: '/empty.pdf' });
    expect(record.fullName).toBeUndefined();
    expect(record.emails).toBeUndefined();
  });
});

// ===========================================================================
// 3. textExtractor — tests with pdf-parse mocked
// ===========================================================================

describe('extractTextFromPdf', () => {
  it('returns RawResumeData with text and page count from pdf-parse', async () => {
    const tempFile = writeTempFile('%PDF fake content');
    setPdfText('Hello World', 3);

    try {
      const result = await extractTextFromPdf(tempFile);
      expect(result.text).toBe('Hello World');
      expect(result.numPages).toBe(3);
      expect(result.origin).toBe(path.resolve(tempFile));
    } finally {
      cleanup(tempFile);
    }
  });

  it('throws ResumeExtractError for a missing file', async () => {
    await expect(extractTextFromPdf('/no/such/file.pdf')).rejects.toThrow(
      ResumeExtractError,
    );
  });

  it('throws ResumeExtractError when pdf-parse rejects', async () => {
    const tempFile = writeTempFile('not a real pdf');
    mockPdfParse.mockRejectedValueOnce(new Error('invalid PDF') as never);

    try {
      await expect(extractTextFromPdf(tempFile)).rejects.toThrow(ResumeExtractError);
    } finally {
      cleanup(tempFile);
    }
  });
});

// ===========================================================================
// 4. ResumeParser — adapter tests
// ===========================================================================

describe('ResumeParser', () => {
  const parser = new ResumeParser();

  it('returns RawResumeData from a readable file', async () => {
    const tempFile = writeTempFile('%PDF dummy');
    setPdfText('Resume text here', 2);

    try {
      const result = await parser.parse(tempFile);
      expect(result.text).toBe('Resume text here');
      expect(result.numPages).toBe(2);
    } finally {
      cleanup(tempFile);
    }
  });

  it('throws ResumeExtractError for a missing file', async () => {
    await expect(parser.parse('/does/not/exist.pdf')).rejects.toThrow(ResumeExtractError);
  });
});

// ===========================================================================
// 5. ingestResume — integration tests (pdf-parse mocked)
// ===========================================================================

describe('ingestResume', () => {
  it('returns a result with a populated NormalizedRecord', async () => {
    const tempFile = writeTempFile('%PDF dummy');
    setPdfText(SAMPLE_RESUME, 1);

    try {
      const result = await ingestResume(tempFile);
      expect(result.record.fullName).toBe('Jane Smith');
      expect(result.record.emails?.length).toBeGreaterThan(0);
      expect(result.extractedFields).toContain('fullName');
      expect(result.extractedFields).toContain('emails');
    } finally {
      cleanup(tempFile);
    }
  });

  it('reports page count from the PDF', async () => {
    const tempFile = writeTempFile('%PDF dummy');
    setPdfText(SAMPLE_RESUME, 2);

    try {
      const result = await ingestResume(tempFile);
      expect(result.numPages).toBe(2);
    } finally {
      cleanup(tempFile);
    }
  });

  it('returns a partial record (no skills) without throwing', async () => {
    const minimalResume = 'Jane Smith\njane@example.com';
    const tempFile = writeTempFile('%PDF dummy');
    setPdfText(minimalResume, 1);

    try {
      const result = await ingestResume(tempFile);
      expect(result.record.fullName).toBe('Jane Smith');
      expect(result.extractedFields).not.toContain('skills');
    } finally {
      cleanup(tempFile);
    }
  });

  it('throws ResumeIngestionError for a missing file', async () => {
    await expect(ingestResume('/no/such/resume.pdf')).rejects.toThrow(
      ResumeIngestionError,
    );
  });

  it('throws ResumeIngestionError when pdf-parse fails', async () => {
    const tempFile = writeTempFile('corrupt content');
    mockPdfParse.mockRejectedValueOnce(new Error('Corrupt PDF') as never);

    try {
      await expect(ingestResume(tempFile)).rejects.toThrow(ResumeIngestionError);
    } finally {
      cleanup(tempFile);
    }
  });

  it('lists all extracted fields in the result', async () => {
    const tempFile = writeTempFile('%PDF dummy');
    setPdfText(SAMPLE_RESUME, 1);

    try {
      const result = await ingestResume(tempFile);
      const fields = result.extractedFields;
      expect(fields).toContain('skills');
      expect(fields).toContain('education');
      expect(fields).toContain('experience');
    } finally {
      cleanup(tempFile);
    }
  });
});
