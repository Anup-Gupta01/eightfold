import { CandidateValidator } from '../validation/candidateValidator';

// ---------------------------------------------------------------------------
// CandidateValidator unit tests
// ---------------------------------------------------------------------------

const validCandidate = {
  candidateId: '123e4567-e89b-12d3-a456-426614174000',
  fullName: 'Jane Doe',
  emails: [{ address: 'jane.doe@example.com', tag: 'personal' }],
  phones: [{ number: '+1-555-0100', tag: 'mobile' }],
  location: { city: 'San Francisco', state: 'CA', country: 'US' },
  headline: 'Senior Backend Engineer',
  skills: [{ name: 'TypeScript', proficiency: 'expert', yearsOfExperience: 5 }],
  experience: [
    {
      company: 'Acme Corp',
      title: 'Software Engineer',
      startDate: { year: 2020, month: 3 },
      isCurrent: true,
    },
  ],
  education: [
    {
      institution: 'MIT',
      degree: 'B.S.',
      fieldOfStudy: 'Computer Science',
      endDate: { year: 2020 },
    },
  ],
  socialLinks: [{ platform: 'linkedin', url: 'https://linkedin.com/in/janedoe' }],
  provenance: [
    {
      sourceType: 'csv',
      sourceId: 'candidates.csv',
      ingestedAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  overallConfidence: 0.85,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('CandidateValidator', () => {
  const validator = new CandidateValidator();

  it('accepts a valid candidate', () => {
    const result = validator.validate(validCandidate);
    expect(result.valid).toBe(true);
  });

  it('rejects a candidate with an invalid email address', () => {
    const result = validator.validate({
      ...validCandidate,
      emails: [{ address: 'not-an-email' }],
    });
    expect(result.valid).toBe(false);
  });

  it('rejects a candidate with a non-UUID candidateId', () => {
    const result = validator.validate({ ...validCandidate, candidateId: 'bad-id' });
    expect(result.valid).toBe(false);
  });

  it('rejects a candidate missing fullName', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fullName, ...withoutFullName } = validCandidate;
    const result = validator.validate(withoutFullName);
    expect(result.valid).toBe(false);
  });

  it('rejects a candidate with empty provenance array', () => {
    const result = validator.validate({ ...validCandidate, provenance: [] });
    expect(result.valid).toBe(false);
  });

  it('rejects overallConfidence outside [0, 1]', () => {
    const result = validator.validate({ ...validCandidate, overallConfidence: 1.5 });
    expect(result.valid).toBe(false);
  });
});
