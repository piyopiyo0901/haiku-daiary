import assert from 'node:assert/strict';
import { countReadingChars } from '../lib/reading.js';

const case1 = countReadingChars('漢字', 'かんじ');
assert.equal(case1.count, 3, 'yomi should be used when provided');

const case2 = countReadingChars('テスト', 'カタカナ');
assert.equal(case2.count, 4, 'katakana should be normalized to hiragana');

const case3 = countReadingChars('あ、い。', '');
assert.equal(case3.count, 2, 'punctuation should be removed');

const case4 = countReadingChars('abc', '');
assert.equal(case4.count, 3, 'latin letters should be counted when yomi is empty');

console.log('reading-count.test.js: ok');
