import { HaikuDraft, HaikuEntry, createEmptyDraft } from './haiku';

export const DRAFT_KEY = 'haiku_draft_v1';
export const ENTRIES_KEY = 'haiku_entries_v1';

type LoadResult<T> = {
  value: T;
  error?: string;
};

const isBrowser = () => typeof window !== 'undefined';

const safeParse = <T>(raw: string, fallback: T): LoadResult<T> => {
  try {
    return { value: JSON.parse(raw) as T };
  } catch (error) {
    return { value: fallback, error: '読み込みに失敗しました。' };
  }
};

export const loadDraft = (): LoadResult<HaikuDraft> => {
  if (!isBrowser()) return { value: createEmptyDraft() };
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return { value: createEmptyDraft() };
    const parsed = safeParse<HaikuDraft>(raw, createEmptyDraft());
    const value = {
      ...createEmptyDraft(),
      ...parsed.value,
    };
    return { value, error: parsed.error };
  } catch (error) {
    return { value: createEmptyDraft(), error: '下書きの読み込みに失敗しました。' };
  }
};

export const saveDraft = (draft: HaikuDraft): LoadResult<null> => {
  if (!isBrowser()) return { value: null };
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return { value: null };
  } catch (error) {
    return { value: null, error: '下書きの保存に失敗しました。' };
  }
};

export const clearDraft = (): LoadResult<null> => {
  if (!isBrowser()) return { value: null };
  try {
    window.localStorage.removeItem(DRAFT_KEY);
    return { value: null };
  } catch (error) {
    return { value: null, error: '下書きの削除に失敗しました。' };
  }
};

export const loadEntries = (): LoadResult<HaikuEntry[]> => {
  if (!isBrowser()) return { value: [] };
  try {
    const raw = window.localStorage.getItem(ENTRIES_KEY);
    if (!raw) return { value: [] };
    return safeParse<HaikuEntry[]>(raw, []);
  } catch (error) {
    return { value: [], error: '保存データの読み込みに失敗しました。' };
  }
};

export const saveEntries = (entries: HaikuEntry[]): LoadResult<null> => {
  if (!isBrowser()) return { value: null };
  try {
    window.localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
    return { value: null };
  } catch (error) {
    return { value: null, error: '保存データの更新に失敗しました。' };
  }
};
