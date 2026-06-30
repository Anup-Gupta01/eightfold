import { ICsvSource, RawCsvRow } from './types';

// ---------------------------------------------------------------------------
// CsvParser — skeleton implementation
// Business logic to be added in a later task.
// ---------------------------------------------------------------------------

export class CsvParser implements ICsvSource {
  /**
   * Reads and parses a CSV file.
   * @param filePath - Absolute or relative path to the .csv file
   */
  async parse(_filePath: string): Promise<RawCsvRow[]> {
    // TODO: implement using csv-parser stream
    throw new Error('CsvParser.parse() not yet implemented');
  }
}
