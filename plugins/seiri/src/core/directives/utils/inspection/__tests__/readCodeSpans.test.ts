import { expect, it } from 'vitest';

import { readCodeSpans } from '../readCodeSpans.js';

it('returns the content of each inline span in order, keeping duplicates', () => {
  expect(readCodeSpans('`a.md` then `b.md` and `a.md`')).toEqual([
    'a.md',
    'b.md',
    'a.md',
  ]);
});

it('closes a span only with a run of the same length', () => {
  expect(readCodeSpans('`` a`b.md ``')).toEqual(['a`b.md']);
  expect(readCodeSpans('`a``b`')).toEqual(['a``b']);
});

it('finds no span for an opening run that is never closed', () => {
  expect(readCodeSpans('``a`')).toEqual([]);
  expect(readCodeSpans('one ` tick')).toEqual([]);
});

it('strips one space from each end when both ends have one, unless the span is all spaces', () => {
  expect(readCodeSpans('`` notes.md ``')).toEqual(['notes.md']);
  expect(readCodeSpans('`  x  `')).toEqual([' x ']);
  expect(readCodeSpans('`  `')).toEqual(['  ']);
  expect(readCodeSpans('` x`')).toEqual([' x']);
});

it('turns a table escape of the pipe into the pipe', () => {
  expect(readCodeSpans('| `plan\\|notes.md` |')).toEqual(['plan|notes.md']);
});

it.each([
  ['backtick', '```md\n`inside.md`\n```\n`after.md`', ['after.md']],
  ['tilde', '~~~\n`inside.md`\n~~~\n`after.md`', ['after.md']],
  ['longer fence', '````\n```\n`inside.md`\n````\n`after.md`', ['after.md']],
  ['indented fence', '   ```\n`inside.md`\n   ```\n`after.md`', ['after.md']],
  ['unclosed fence', '`before.md`\n```\n`inside.md`', ['before.md']],
  ['different fence character', '```\n~~~\n`inside.md`\n```', []],
])('ignores spans inside a fenced block: %s', (_case, text, expected) => {
  expect(readCodeSpans(text)).toEqual(expected);
});
