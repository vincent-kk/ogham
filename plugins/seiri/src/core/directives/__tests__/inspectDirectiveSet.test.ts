import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import {
  ensureDirectorySync,
  portableJoin,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, expect, it } from 'vitest';

import { inspectDirectiveSet } from '../utils/inspectDirectiveSet.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(portableJoin(tmpdir(), 'seiri-inspect-sets-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

/** Create a set from file contents. */
function seedSet(files: Record<string, string>): void {
  const directory = portableJoin(root, '.seiri', 'directives', 'flow');
  ensureDirectorySync(directory);
  for (const [name, body] of Object.entries(files))
    writeFileAtomicallySync(portableJoin(directory, name), body);
}

const record = (text: string) =>
  `{"at":"2026-01-01T00:00:00.000Z","text":"${text}"}`;

it('returns undefined for a set that does not exist', () => {
  expect(inspectDirectiveSet(root, 'flow')).toBeUndefined();
});

it('reports an unstructured set without violations and counts its notepad lines', () => {
  seedSet({
    'focus.md': 'x'.repeat(20000),
    'notepad.jsonl': `${record('a')}\n\n not json \n${record('b')}\n`,
  });
  expect(inspectDirectiveSet(root, 'flow')).toEqual({
    structured: false,
    violations: [],
    notepadLines: 3,
  });
});

it('reports a conforming structured set as clean with a zero notepad count', () => {
  seedSet({
    'index.md': 'See `principles.md` and `dashboard.md`. Logs: notepad.jsonl',
    'principles.md': 'x'.repeat(10000),
    'dashboard.md': 'y'.repeat(3000),
    'notepad.jsonl': '',
  });
  expect(inspectDirectiveSet(root, 'flow')).toEqual({
    structured: true,
    violations: [],
    notepadLines: 0,
  });
});

it('reports over_limit with the measured bytes and the limit for each limited document', () => {
  seedSet({
    'index.md': `\`principles.md\` \`dashboard.md\` ${'z'.repeat(4000)}`,
    'principles.md': 'x'.repeat(10001),
    'dashboard.md': 'é'.repeat(1501),
  });
  expect(inspectDirectiveSet(root, 'flow')?.violations).toEqual([
    {
      file: 'dashboard.md',
      problem: 'over_limit',
      detail: '3002 bytes; limit 3000',
    },
    {
      file: 'index.md',
      problem: 'over_limit',
      detail: '4031 bytes; limit 4000',
    },
    {
      file: 'principles.md',
      problem: 'over_limit',
      detail: '10001 bytes; limit 10000',
    },
  ]);
});

it('reports unlisted for a set file the entry document never names, except the entry itself', () => {
  seedSet({
    'index.md': 'Only `principles.md` is described here.',
    'principles.md': 'p',
    'extra.md': 'e',
    'notes/deep.md': 'd',
  });
  expect(inspectDirectiveSet(root, 'flow')?.violations).toEqual([
    { file: 'extra.md', problem: 'unlisted', detail: 'not named in index.md' },
    {
      file: 'notes/deep.md',
      problem: 'unlisted',
      detail: 'not named in index.md',
    },
  ]);
});

it('reports missing for a markdown file named in a code span but absent, and ignores jsonl and plain text', () => {
  seedSet({
    'index.md':
      'Read `principles.md` and `gone.md`; write `notepad.jsonl`. Plain missing.md is prose.',
    'principles.md': 'p',
  });
  expect(inspectDirectiveSet(root, 'flow')?.violations).toEqual([
    { file: 'gone.md', problem: 'missing', detail: 'named in index.md' },
  ]);
});

it('does not report an absent standard document that the entry template names', () => {
  seedSet({
    'index.md':
      'Detail lives in `principles.md`; refresh `dashboard.md`; see `orchestration.md`.',
  });
  expect(inspectDirectiveSet(root, 'flow')?.violations).toEqual([]);
});

it('does not report a path outside the set that the entry points to', () => {
  seedSet({
    'index.md':
      'State lives in `.seiri/tasks/state/state.md`, `/abs/plan.md` and `../notes.md`.',
  });
  expect(inspectDirectiveSet(root, 'flow')?.violations).toEqual([]);
});

it('reports a file as unlisted when the entry names only a longer file name that contains it', () => {
  seedSet({ 'index.md': 'See `old-notes.md`.', 'notes.md': 'n' });
  expect(inspectDirectiveSet(root, 'flow')?.violations).toEqual([
    { file: 'notes.md', problem: 'unlisted', detail: 'not named in index.md' },
    { file: 'old-notes.md', problem: 'missing', detail: 'named in index.md' },
  ]);
});

it.each([
  ['a longer non-ASCII name', '`새notes.md`'],
  ['a name continued by non-ASCII text', 'notes.md한 is another file'],
  ['a path beneath it', '`notes.md/child.md`'],
  ['a name with a further extension', 'notes.md.bak is a backup'],
])('does not take %s as naming the file', (_case, text) => {
  seedSet({ 'index.md': text, 'notes.md': 'n' });
  expect(
    inspectDirectiveSet(root, 'flow')?.violations.filter(
      ({ problem }) => problem === 'unlisted',
    ),
  ).toEqual([
    { file: 'notes.md', problem: 'unlisted', detail: 'not named in index.md' },
  ]);
});

it('takes a bare name that ends a sentence as naming the file', () => {
  seedSet({
    'index.md': 'See notes.md. Then stop at 노트.md.',
    'notes.md': 'n',
    '노트.md': 'k',
  });
  expect(inspectDirectiveSet(root, 'flow')?.violations).toEqual([]);
});

it('reports invalid_line with the line number for non-object log lines and skips blank lines', () => {
  seedSet({
    'index.md': 'Logs notepad.jsonl history.jsonl',
    'notepad.jsonl': `${record('ok')}\n\nnot json\n[1,2]\n${record('fine')}\n`,
    'history.jsonl': `${record('ok')}\nnull\n`,
  });
  expect(inspectDirectiveSet(root, 'flow')).toEqual({
    structured: true,
    violations: [
      { file: 'history.jsonl', problem: 'invalid_line', detail: 'line 2' },
      { file: 'notepad.jsonl', problem: 'invalid_line', detail: 'line 3' },
      { file: 'notepad.jsonl', problem: 'invalid_line', detail: 'line 4' },
    ],
    notepadLines: 4,
  });
});
