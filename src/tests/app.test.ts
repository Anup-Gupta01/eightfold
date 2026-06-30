import { createApp } from '../app';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Health route smoke tests
// ---------------------------------------------------------------------------

describe('GET /health', () => {
  const app = createApp();

  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('includes a timestamp and uptime field', async () => {
    const res = await request(app).get('/health');
    expect(typeof res.body.timestamp).toBe('string');
    expect(typeof res.body.uptime).toBe('number');
  });
});

describe('Unknown routes', () => {
  const app = createApp();

  it('returns 404 for unknown paths', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
