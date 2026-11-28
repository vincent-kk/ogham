import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import {
  ensureDirectorySync,
  portableJoin,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, expect, it } from 'vitest';

import type { DirectiveViolation } from '../../../types/directives.js';
import { inspectDirectiveSet } from '../utils/inspectDirectiveSet.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(portableJoin(tmpdir(), 'seiri-inspect-refs-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

/** Create a set whose entry document is `index` and whose other files hold one letter. */
function seed(index: string, others: string[] = []): DirectiveViolation[] {
  const directory = portableJoin(root, '.seiri', 'directives', 'flow');
  ensureDirectorySync(directory);
  writeFileAtomicallySync(portableJoin(directory, 'index.md'), index);
  for (const name of others) {
    ensureDirectorySync(portableJoin(directory, name, '..'));
    writeFileAtomicallySync(portableJoin(directory, name), 'x');
  }
  return inspectDirectiveSet(root, 'flow')?.violations ?? [];
}

const unlisted = (file: string): DirectiveViolation => ({
  file,
  problem: 'unlisted',
  detail: 'not named in index.md',
});
const missing = (file: string): DirectiveViolation => ({
  file,
  problem: 'missing',
  detail: 'named in index.md',
});

it('reports a file mentioned only in prose as unlisted', () => {
  expect(seed('Read notes.md before anything.', ['notes.md'])).toEqual([
    unlisted('notes.md'),
  ]);
});

it('takes a code span equal to the path as naming the file', () => {
  expect(seed('Read `notes.md` first.', ['notes.md'])).toEqual([]);
});

it('does not take a span with a prefix as naming the file, and reports the span as missing when the file is absent', () => {
  expect(seed('See `+notes.md`.', ['notes.md'])).toEqual([
    unlisted('notes.md'),
    missing('+notes.md'),
  ]);
});

it('reports only the unlisted file when the prefixed file exists as well', () => {
  expect(seed('See `+notes.md`.', ['notes.md', '+notes.md'])).toEqual([
    unlisted('notes.md'),
  ]);
});

it.each([
  ['a longer non-ASCII name', '`새notes.md`'],
  ['a path beneath it', '`notes.md/child.md`'],
  ['a name with a further extension', '`notes.md.bak`'],
  ['an emoji prefix', '`📌notes.md`'],
])('does not take %s as naming the file', (_case, text) => {
  expect(
    seed(text, ['notes.md']).filter(({ problem }) => problem === 'unlisted'),
  ).toEqual([unlisted('notes.md')]);
});

it('takes a table cell with an escaped pipe as naming the file with the pipe', () => {
  expect(seed('| Plan | `plan\\|notes.md` |', ['plan|notes.md'])).toEqual([]);
});

it('takes a span inside a fenced block as naming nothing', () => {
  expect(seed('```md\n`notes.md` and `gone.md`\n```\n', ['notes.md'])).toEqual([
    unlisted('notes.md'),
  ]);
});

it('takes a double-backtick span with padding as naming the file', () => {
  expect(seed('Read `` notes.md ``.', ['notes.md'])).toEqual([]);
});

it('checks a dot-file in the set root and reports it as missing when absent', () => {
  expect(seed('See `.notes.md`.')).toEqual([missing('.notes.md')]);
});

it.each(['.seiri/tasks/state.md', '/abs/plan.md', '../x.md', '~/x.md'])(
  'does not report the path %s outside the set as missing',
  (path) => {
    expect(seed(`See \`${path}\`.`)).toEqual([]);
  },
);

it('checks a nested path when the set has a directory of that name', () => {
  expect(
    seed('See `notes/topic.md` and `notes/other.md`.', ['notes/other.md']),
  ).toEqual([missing('notes/topic.md')]);
});

it('does not check a nested path whose first segment is no directory of the set', () => {
  expect(seed('See `notes/topic.md`.', ['other.md'])).toEqual([
    unlisted('other.md'),
  ]);
});

it('takes a span with spaces as neither a listing nor a missing file', () => {
  expect(seed('See `See notes.md`.', ['notes.md'])).toEqual([
    unlisted('notes.md'),
  ]);
});

it('does not report an absent optional document, jsonl file or plain-text file', () => {
  expect(
    seed('`principles.md` `dashboard.md` `orchestration.md` `x.jsonl` `a.txt`'),
  ).toEqual([]);
});

it('lists unlisted files in set order before missing references in order of first appearance', () => {
  expect(seed('`zz.md` `aa.md` `zz.md`', ['b.md', 'a.md'])).toEqual([
    unlisted('a.md'),
    unlisted('b.md'),
    missing('zz.md'),
    missing('aa.md'),
  ]);
});
