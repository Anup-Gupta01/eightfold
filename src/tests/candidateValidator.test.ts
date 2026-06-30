import { CandidateValidator } from '../validation/candidateValidator';

// ---------------------------------------------------------------------------
// CandidateValidator unit tests
// ---------------------------------------------------------------------------

const validCandidate = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  phone: '+1-555-0100',
  skills: [],
  experience: [],
  education: [],
  sources: [
    {
      type: 'csv',
      origin: 'candidates.csv',
      ingestedAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('CandidateValidator', () => {
  const validator = new CandidateValidator();

  it('accepts a valid candidate', () => {
    const result = validator.validate(validCandidate);
    expect(result.valid).toBe(true);
  });

  it('rejects a candidate with an invalid email', () => {
    const result = validator.validate({ ...validCandidate, email: 'not-an-email' });
    expect(result.valid).toBe(false);
  });

  it('rejects a candidate with a non-UUID id', () => {
    const result = validator.validate({ ...validCandidate, id: 'bad-id' });
    expect(result.valid).toBe(false);
  });

  it('rejects a candidate missing required fields', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { firstName, ...withoutFirstName } = validCandidate;
    const result = validator.validate(withoutFirstName);
    expect(result.valid).toBe(false);
  });
});
