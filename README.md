# Candidate Data Transformation Pipeline

> Engineering internship assignment — a Node.js + TypeScript pipeline that ingests candidate data from CSV files and PDF resumes, normalises and merges it into a unified schema, scores each record with a confidence metric, and exposes the results via a RESTful API.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [Getting Started](#getting-started)
5. [Available Scripts](#available-scripts)
6. [API Endpoints](#api-endpoints)
7. [Pipeline Architecture](#pipeline-architecture)
8. [Environment Variables](#environment-variables)
9. [Testing](#testing)
10. [Contributing](#contributing)

---

## Project Overview

The pipeline processes candidate data through five sequential stages:

```
Sources → Normalizers → Merger → Confidence Scorer → Projector → API
```

| Stage            | Responsibility                                              |
|-----------------|-------------------------------------------------------------|
| **Sources**      | Parse raw CSV rows and PDF resume text                      |
| **Normalizers**  | Map raw fields to the canonical `Candidate` schema          |
| **Merger**       | Combine CSV + resume records; resolve field conflicts        |
| **Confidence**   | Score each field and compute an overall data-quality score  |
| **Projector**    | Filter output fields for the API response                   |

---

## Tech Stack

| Tool          | Purpose                              |
|--------------|--------------------------------------|
| Node.js 20   | Runtime                              |
| TypeScript 5 | Type safety                          |
| Express 4    | HTTP server                          |
| Zod          | Schema validation & env parsing      |
| csv-parser   | CSV file ingestion                   |
| pdf-parse    | PDF text extraction                  |
| Axios        | HTTP client (external data sources)  |
| Jest         | Unit & integration testing           |

---

## Folder Structure

```
src/
├── app.ts                  # Express app factory (testable, no port binding)
├── server.ts               # Entry point — binds port, handles shutdown

├── config/
│   ├── env.ts              # Zod-validated environment loader
│   └── index.ts

├── sources/
│   ├── csv/
│   │   ├── types.ts        # RawCsvRow, ICsvSource, CsvNormalizedRecord
│   │   ├── csvParser.ts    # CsvParser class (stub)
│   │   └── index.ts
│   └── resume/
│       ├── types.ts        # RawResumeData, IResumeSource, ResumeNormalizedRecord
│       ├── resumeParser.ts # ResumeParser class (stub)
│       └── index.ts

├── normalizers/
│   ├── csvNormalizer.ts    # CsvNormalizer class (stub)
│   ├── resumeNormalizer.ts # ResumeNormalizer class (stub)
│   └── index.ts

├── merger/
│   ├── merger.ts           # Merger class (stub)
│   └── index.ts

├── confidence/
│   ├── confidenceScorer.ts # ConfidenceScorer class (stub)
│   └── index.ts

├── projection/
│   ├── projector.ts        # Projector class (stub)
│   └── index.ts

├── validation/
│   ├── candidateValidator.ts # Zod schema + CandidateValidator
│   └── index.ts

├── models/
│   ├── candidate.ts        # Candidate interface + Zod schemas
│   ├── api.ts              # ApiResponse, PaginatedResponse types
│   └── index.ts

├── utils/
│   ├── helpers.ts          # generateId, normalizeEmail, etc.
│   ├── logger.ts           # Structured logger
│   ├── errors.ts           # AppError + Errors factory
│   └── index.ts

├── routes/
│   ├── health.ts           # GET /health
│   ├── pipeline.ts         # POST /pipeline/run, GET /pipeline/status/:jobId
│   ├── candidates.ts       # GET /candidates, GET /candidates/:id
│   └── index.ts

└── tests/
    ├── app.test.ts
    ├── candidateValidator.test.ts
    └── helpers.test.ts

sample-data/                # Drop sample .csv / .pdf files here
output/                     # Pipeline writes JSON output here
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- npm ≥ 9

### Install dependencies

```bash
npm install
```

### Configure environment

Copy the example environment file (create `.env` in the project root):

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
SAMPLE_DATA_DIR=./sample-data
OUTPUT_DIR=./output
```

### Start the development server

```bash
npm run dev
```

---

## Available Scripts

| Script              | Description                              |
|--------------------|------------------------------------------|
| `npm run dev`       | Start with hot-reload via ts-node-dev    |
| `npm run build`     | Compile TypeScript to `dist/`            |
| `npm start`         | Run compiled output                      |
| `npm test`          | Run all Jest tests                       |
| `npm run test:watch`| Watch mode                               |
| `npm run test:coverage` | Generate coverage report             |
| `npm run type-check`| Run tsc without emitting files           |

---

## API Endpoints

| Method | Path                       | Status       | Description                 |
|--------|----------------------------|--------------|-----------------------------|
| GET    | `/health`                  | ✅ Live      | Liveness probe              |
| POST   | `/pipeline/run`            | 🚧 Stub      | Trigger transformation run  |
| GET    | `/pipeline/status/:jobId`  | 🚧 Stub      | Check job status            |
| GET    | `/candidates`              | 🚧 Stub      | List processed candidates   |
| GET    | `/candidates/:id`          | 🚧 Stub      | Fetch candidate by UUID     |

---

## Pipeline Architecture

```
┌──────────────────────────────────────────────────────┐
│                        Sources                        │
│  ┌────────────┐              ┌─────────────────────┐  │
│  │ CsvParser  │              │   ResumeParser      │  │
│  │ (csv-parser)│             │   (pdf-parse)       │  │
│  └─────┬──────┘              └──────────┬──────────┘  │
└────────┼────────────────────────────────┼─────────────┘
         │ RawCsvRow[]                    │ RawResumeData
┌────────▼────────────────────────────────▼─────────────┐
│                      Normalizers                       │
│  ┌──────────────────┐     ┌───────────────────────┐   │
│  │  CsvNormalizer   │     │   ResumeNormalizer    │   │
│  └────────┬─────────┘     └──────────┬────────────┘   │
└───────────┼────────────────────────┼──────────────────┘
            │ CsvNormalizedRecord    │ ResumeNormalizedRecord
┌───────────▼────────────────────────▼──────────────────┐
│                        Merger                          │
│              Conflict resolution → Candidate           │
└───────────────────────────┬────────────────────────────┘
                            │ Candidate
┌───────────────────────────▼────────────────────────────┐
│                   Confidence Scorer                     │
│              Attaches ConfidenceScores                  │
└───────────────────────────┬────────────────────────────┘
                            │ Candidate (with confidence)
┌───────────────────────────▼────────────────────────────┐
│                      Validation                         │
│            CandidateValidator (Zod)                     │
└───────────────────────────┬────────────────────────────┘
                            │ Valid Candidate
                         REST API / output/
```

---

## Environment Variables

| Variable                  | Default          | Description                          |
|--------------------------|------------------|--------------------------------------|
| `NODE_ENV`                | `development`    | Runtime environment                  |
| `PORT`                    | `3000`           | HTTP port                            |
| `HOST`                    | `0.0.0.0`        | Bind address                         |
| `SAMPLE_DATA_DIR`         | `./sample-data`  | Source file directory                |
| `OUTPUT_DIR`              | `./output`       | Pipeline output directory            |
| `EXTERNAL_API_BASE_URL`   | *(optional)*     | Base URL for external data sources   |
| `EXTERNAL_API_TIMEOUT_MS` | `10000`          | Axios timeout in milliseconds        |
| `LOG_LEVEL`               | `info`           | `debug` \| `info` \| `warn` \| `error` |

---

## Testing

Tests live in `src/tests/`. Run all tests with:

```bash
npm test
```

Coverage report (HTML + LCOV):

```bash
npm run test:coverage
```

---

## Contributing

1. Each pipeline stage lives in its own folder.
2. Implement the interface, not the class directly — consumers depend on `ICsvNormalizer`, `IMerger`, etc.
3. Add a unit test in `src/tests/` for every non-trivial function.
4. Keep modules focused — if a file exceeds ~150 lines, split it.
