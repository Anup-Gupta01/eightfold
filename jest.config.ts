import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@sources/(.*)$': '<rootDir>/src/sources/$1',
    '^@normalizers/(.*)$': '<rootDir>/src/normalizers/$1',
    '^@merger/(.*)$': '<rootDir>/src/merger/$1',
    '^@confidence/(.*)$': '<rootDir>/src/confidence/$1',
    '^@projection/(.*)$': '<rootDir>/src/projection/$1',
    '^@validation/(.*)$': '<rootDir>/src/validation/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/tests/**',
    '!src/server.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};

export default config;
