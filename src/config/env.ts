import { z } from 'zod';

// ---------------------------------------------------------------------------
// Environment schema — validated at startup, fail-fast on misconfiguration
// ---------------------------------------------------------------------------
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // File paths
  SAMPLE_DATA_DIR: z.string().default('./sample-data'),
  OUTPUT_DIR: z.string().default('./output'),

  // Optional: external API base URL if the pipeline fetches remote data
  EXTERNAL_API_BASE_URL: z.string().url().optional(),
  EXTERNAL_API_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  [${i.path.join('.')}] ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${issues}`);
  }

  return parsed.data;
}

// Singleton — imported everywhere; validated once at module load time.
export const env = loadEnv();
