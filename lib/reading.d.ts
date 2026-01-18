export type ReadingCountResult = {
  count: number;
  normalized: string;
  source: 'yomi' | 'text';
};

export const normalizeReading: (value: string) => string;
export const countReadingChars: (text: string, yomi: string) => ReadingCountResult;
