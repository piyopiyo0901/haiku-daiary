export type HaikuEntry = {
  dateKey: string;
  kami5: string;
  naka7: string;
  shimo5: string;
  createdAt: string;
  updatedAt: string;
};

export type HaikuDraft = {
  kami5: string;
  naka7: string;
  shimo5: string;
};

export const HAIKU_VERSION = 1;

const TOKYO_TIMEZONE = 'Asia/Tokyo';

const pad2 = (value: number) => String(value).padStart(2, '0');

export const getTokyoDateParts = (date: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: TOKYO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '0');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '1');
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '1');
  return { year, month, day };
};

export const getTokyoDateKey = (date: Date = new Date()) => {
  const { year, month, day } = getTokyoDateParts(date);
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

export const formatDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map((value) => Number(value));
  if (!year || !month || !day) return dateKey;
  return `${year}年${month}月${day}日`;
};

export const countHaikuChars = (value: string) => {
  const sanitized = value.replace(/ /g, '');
  return Array.from(sanitized).length;
};

export const buildPreview = (draft: HaikuDraft) => [draft.kami5, draft.naka7, draft.shimo5].join('\n');

export const isValidDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const createEmptyDraft = (): HaikuDraft => ({
  kami5: '',
  naka7: '',
  shimo5: '',
});

export const normalizeEntry = (entry: HaikuEntry): HaikuEntry => ({
  ...entry,
  kami5: entry.kami5 ?? '',
  naka7: entry.naka7 ?? '',
  shimo5: entry.shimo5 ?? '',
});
