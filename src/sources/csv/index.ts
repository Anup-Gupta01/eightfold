// Public API for the CSV source module
export { ingestCsv, CsvIngestionError } from './csvIngestionService';
export type { CsvIngestionResult, CsvRowError } from './csvIngestionService';

export { parseCsvFile, CsvParseError } from './csvParser';
export type { CsvParseOutput } from './csvParser';

export { validateHeaders, normalizeHeaderName } from './columns';
export type { HeaderValidationResult, KnownColumn } from './columns';

export { validateRow } from './rowValidator';
export type { RowValidationResult } from './rowValidator';

export { mapRow } from './rowMapper';

export type { RawCsvRow, ICsvSource, CsvNormalizedRecord } from './types';
