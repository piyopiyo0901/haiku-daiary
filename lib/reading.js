const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const HIRAGANA_OFFSET = 0x60;

const toHiragana = (value) =>
  value.replace(/[\u30a1-\u30f6]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - HIRAGANA_OFFSET),
  );

const stripPunctuation = (value) =>
  value
    .replace(/[\s　]/g, '')
    .replace(/[、。．，,.!！?？「」『』（）()［］\[\]【】・:;：；…‥]/g, '');

const stripSmallKana = (value) => value.replace(/[ゃゅょャュョ]/g, '');

export const normalizeReading = (value) => stripSmallKana(stripPunctuation(toHiragana(value)));

export const countReadingChars = (text, yomi) => {
  const hasYomi = typeof yomi === 'string' && yomi.trim().length > 0;
  const source = hasYomi ? 'yomi' : 'text';
  const raw = hasYomi ? yomi : text;
  const normalized = normalizeReading(raw ?? '');
  return {
    count: Array.from(normalized).length,
    normalized,
    source,
  };
};
