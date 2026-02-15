import Papa from 'papaparse';

export interface CsvParseResult<T> {
  data: T[];
  errors: Papa.ParseError[];
}

export function parseCsv<T>(csvString: string): CsvParseResult<T> {
  const result = Papa.parse<T>(csvString, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => value.trim(),
  });

  return {
    data: result.data,
    errors: result.errors,
  };
}
