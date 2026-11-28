import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';

import {
  ensureDirectorySync,
  portableJoin,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, expect, it } from 'vitest';

import type { DirectiveBinding } from '../../../types/directives.js';
import { readDirectiveBindings } from '../utils/readDirectiveBindings.js';
import { renderDirectives } from '../utils/renderDirectives.js';
import { selectDirectiveSets } from '../utils/selectDirectiveSets.js';
import { summarizeDirectiveSet } from '../utils/summarizeDirectiveSet.js';

const expectedPointerRead =
  /^Read index\.md in each directory before continuing; where there is none, reread every file except binding\.json\.$/;

let root: string;
let directory: string;

beforeEach(() => {
  root = mkdtempSync(portableJoin(tmpdir(), 'seiri-directive-sets-'));
  directory = portableJoin(root, '.seiri', 'directives', 'focus');
  ensureDirectorySync(directory);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

it('selects enabled sets for this actor or all actors in the same checkout', () => {
  const binding: DirectiveBinding = {
    enabled: true,
    root,
    scope: 'session',
    actor: 'a',
    boundAt: 1,
  };
  expect(
    selectDirectiveSets(
      {
        mine: binding,
        other: { ...binding, actor: 'b' },
        everyone: { enabled: true, root, scope: 'all', boundAt: 1 },
        disabled: { ...binding, enabled: false },
        copied: { ...binding, root: portableJoin(root, 'elsewhere') },
      },
      'a',
      root,
    ),
  ).toEqual(['everyone', 'mine']);
});

it('skips invalid names, traversals, symlinks and reserved files', () => {
  ensureDirectorySync(portableJoin(directory, 'binding.lock'));
  writeFileAtomicallySync(
    portableJoin(directory, 'binding.lock', 'ignore.md'),
    'ignore',
  );
  writeFileAtomicallySync(portableJoin(directory, 'binding.json'), '{}');
  writeFileAtomicallySync(
    portableJoin(directory, 'binding.json.tmp-abandoned'),
    'ignore',
  );
  for (const reason of ['stale', 'release']) {
    const quarantine = portableJoin(
      directory,
      `binding.lock.${reason}-abandoned`,
    );
    ensureDirectorySync(quarantine);
    writeFileAtomicallySync(portableJoin(quarantine, 'owner'), 'ignored token');
  }
  writeFileAtomicallySync(portableJoin(directory, 'scratch.tmp'), 'ignore');
  ensureDirectorySync(portableJoin(directory, 'nested'));
  writeFileAtomicallySync(portableJoin(directory, 'nested', 'a.md'), '한');
  writeFileAtomicallySync(portableJoin(directory, 'b.md'), 'b');
  symlinkSync(root, portableJoin(directory, 'linked'), 'junction');
  symlinkSync(root, portableJoin(directory, '..', 'escaped'), 'junction');

  expect(summarizeDirectiveSet(root, 'focus')).toEqual({
    set: 'focus',
    files: ['b.md', 'nested/a.md'],
    bytes: 4,
  });
  for (const set of ['../directives/focus', 'FOCUS', 'escaped', 'a--b'])
    expect(summarizeDirectiveSet(root, set)).toBeUndefined();
});

it('does not read sets through a symlink in the directives path', () => {
  writeFileAtomicallySync(portableJoin(directory, 'focus.md'), 'private');
  const directives = portableJoin(root, '.seiri', 'directives');
  const outside = portableJoin(root, 'outside');
  rmSync(directives, { recursive: true });
  ensureDirectorySync(portableJoin(outside, 'focus'));
  writeFileAtomicallySync(
    portableJoin(outside, 'focus', 'focus.md'),
    'private',
  );
  symlinkSync(outside, directives, 'junction');

  expect(summarizeDirectiveSet(root, 'focus')).toBeUndefined();
  expect(readDirectiveBindings(root)).toEqual({});
});

it('renders both sets inline at the combined boundary and both as pointers below it', () => {
  const second = portableJoin(directory, '..', 'second');
  ensureDirectorySync(second);
  writeFileAtomicallySync(portableJoin(directory, 'a.md'), 'first 한 body');
  writeFileAtomicallySync(portableJoin(second, 'b.md'), 'second body');
  const sets = ['focus', 'second'].map((set) => {
    const summary = summarizeDirectiveSet(root, set);
    if (!summary) throw new Error('Test set is missing');
    return summary;
  });

  const inline = renderDirectives(root, sets, Infinity).join('\n');
  expect(inline).toContain('focus');
  expect(inline).toContain('a.md');
  expect(inline).toContain('first 한 body');
  expect(inline).toContain('second body');
  expect(renderDirectives(root, sets, inline.length).join('\n')).toBe(inline);
  const pointer = renderDirectives(root, sets, inline.length - 1).join('\n');
  expect(pointer.split('\n')).toEqual([
    '[seiri] Directives focus',
    directory,
    '[seiri] Directives second',
    second,
    expect.stringMatching(expectedPointerRead),
  ]);
  expect(pointer).not.toMatch(/first 한 body|second body/);
  expect(
    renderDirectives(root, sets, inline.length, Buffer.byteLength),
  ).toEqual(pointer.split('\n'));
});

it('keeps pointer output within the Codex budget even when a set has many files', () => {
  const budget = 4000;
  const files = Array.from({ length: 100 }, (_, index) =>
    portableJoin(directory, `directive-${String(index).padStart(3, '0')}.md`),
  );
  for (const file of files)
    writeFileAtomicallySync(file, 'Keep this directive.');
  expect(Buffer.byteLength(files.join('\n'))).toBeGreaterThan(budget);
  const summary = summarizeDirectiveSet(root, 'focus');
  if (!summary) throw new Error('Test set is missing');

  const lines = renderDirectives(root, [summary], budget, Buffer.byteLength);
  expect(Buffer.byteLength(lines.join('\n'))).toBeLessThanOrEqual(budget);
  expect(lines).toContain(directory);
  expect(lines.some((line) => files.includes(line))).toBe(false);
  expect(lines.at(-1)).toMatch(expectedPointerRead);
});
