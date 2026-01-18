export type HaikuSeason = 'spring' | 'summer' | 'autumn' | 'winter' | 'none';

export type HaikuEntry = {
  id: string;
  text: string;
  yomi: string;
  season: HaikuSeason;
  createdAt: string;
  updatedAt: string;
};

export type HaikuDraft = {
  text: string;
  yomi: string;
  season: HaikuSeason;
};

export const HAIKU_VERSION = 2;

const TOKYO_TIMEZONE = 'Asia/Tokyo';

export const seasonOptions: { value: HaikuSeason; label: string }[] = [
  { value: 'spring', label: '春' },
  { value: 'summer', label: '夏' },
  { value: 'autumn', label: '秋' },
  { value: 'winter', label: '冬' },
  { value: 'none', label: '無季' },
];

export const seasonLabel = (season: HaikuSeason) => {
  const found = seasonOptions.find((option) => option.value === season);
  return found ? found.label : '無季';
};

export const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: TOKYO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export const createEmptyDraft = (): HaikuDraft => ({
  text: '',
  yomi: '',
  season: 'none',
});

export const normalizeEntry = (entry: HaikuEntry): HaikuEntry => ({
  ...entry,
  text: entry.text ?? '',
  yomi: entry.yomi ?? '',
  season: entry.season ?? 'none',
  createdAt: entry.createdAt ?? new Date().toISOString(),
  updatedAt: entry.updatedAt ?? entry.createdAt ?? new Date().toISOString(),
});
