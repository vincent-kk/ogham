import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import {
  ensureDirectorySync,
  portableJoin,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, expect, it } from 'vitest';

import { renderDirectives } from '../utils/renderDirectives.js';
import { summarizeDirectiveSet } from '../utils/summarizeDirectiveSet.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(portableJoin(tmpdir(), 'seiri-structured-sets-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

/** Create a set from file contents and return its directory and summary. */
function seedSet(set: string, files: Record<string, string>) {
  const directory = portableJoin(root, '.seiri', 'directives', set);
  ensureDirectorySync(directory);
  for (const [name, body] of Object.entries(files))
    writeFileAtomicallySync(portableJoin(directory, name), body);
  const summary = summarizeDirectiveSet(root, set);
  if (!summary) throw new Error('Test set is missing');
  return { directory, summary };
}

it('inlines the entry document and names the nonempty required documents only', () => {
  const { directory, summary } = seedSet('flow', {
    'index.md': 'entry body',
    'principles.md': 'principle body',
    'dashboard.md': 'dashboard body',
    'notepad.jsonl': '',
    'history.jsonl': '{"at":"x","text":"y"}\n',
  });

  expect(renderDirectives(root, [summary], Infinity)).toEqual([
    '[seiri] Directives flow',
    directory,
    '--- index.md ---',
    'entry body',
    'Read principles.md, dashboard.md in that directory before continuing.',
  ]);
});

it('omits the read line when no required document is present', () => {
  const { summary } = seedSet('flow', { 'index.md': 'entry body' });
  expect(renderDirectives(root, [summary], Infinity).join('\n')).not.toMatch(
    /Read /,
  );
});

it('falls back to a pointer that reports an entry document over 4000 bytes', () => {
  const { directory, summary } = seedSet('flow', {
    'index.md': 'x'.repeat(4001),
  });
  const lines = renderDirectives(root, [summary], Infinity);
  expect(lines).toEqual([
    '[seiri] Directives flow',
    directory,
    'index.md exceeds 4000 bytes; split it.',
    'Read index.md in each directory before continuing; where there is none, reread every file except binding.json.',
  ]);
});

it('accepts an entry document of exactly 4000 bytes', () => {
  const { summary } = seedSet('flow', { 'index.md': 'x'.repeat(4000) });
  expect(renderDirectives(root, [summary], Infinity)).toContain(
    '--- index.md ---',
  );
});

it('renders mixed sets inline within the budget and as pointers when any entry is over its limit', () => {
  const plain = seedSet('plain', { 'a.md': 'plain body' });
  const structured = seedSet('flow', { 'index.md': 'entry body' });
  const sets = [plain.summary, structured.summary];
  const inline = renderDirectives(root, sets, Infinity);
  expect(inline).toContain('plain body');
  expect(inline).toContain('entry body');

  writeFileAtomicallySync(
    portableJoin(structured.directory, 'index.md'),
    'x'.repeat(4001),
  );
  const pointer = renderDirectives(root, sets, Infinity);
  expect(pointer.join('\n')).not.toContain('plain body');
  expect(pointer).toContain(plain.directory);
  expect(pointer).toContain('index.md exceeds 4000 bytes; split it.');
});
