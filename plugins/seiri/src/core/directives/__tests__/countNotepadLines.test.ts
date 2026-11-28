import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import {
  ensureDirectorySync,
  portableJoin,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, expect, it } from 'vitest';

import { countNotepadLines } from '../utils/countNotepadLines.js';

let root: string;
let directory: string;

beforeEach(() => {
  root = mkdtempSync(portableJoin(tmpdir(), 'seiri-count-notepad-'));
  directory = portableJoin(root, '.seiri', 'directives', 'flow');
  ensureDirectorySync(directory);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

it('counts the nonblank lines of the notepad', () => {
  writeFileAtomicallySync(
    portableJoin(directory, 'notepad.jsonl'),
    '{"a":1}\n\n  \nnot json\n{"b":2}\n',
  );
  expect(countNotepadLines(root, 'flow')).toBe(3);
});

it('returns zero when the notepad or the set is absent', () => {
  expect(countNotepadLines(root, 'flow')).toBe(0);
  expect(countNotepadLines(root, 'gone')).toBe(0);
});

it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
  'returns zero when the notepad cannot be read',
  () => {
    const notepad = portableJoin(directory, 'notepad.jsonl');
    writeFileAtomicallySync(notepad, '{"a":1}\n');
    chmodSync(notepad, 0o000);
    expect(countNotepadLines(root, 'flow')).toBe(0);
  },
);

it('returns zero when the notepad path is a directory', () => {
  mkdirSync(portableJoin(directory, 'notepad.jsonl'));
  expect(countNotepadLines(root, 'flow')).toBe(0);
});

it.skipIf(process.platform === 'win32')(
  'returns zero when the notepad is a link to a file outside the set',
  () => {
    const outside = portableJoin(root, 'outside.jsonl');
    writeFileAtomicallySync(outside, '{"a":1}\n{"b":2}\n');
    symlinkSync(outside, portableJoin(directory, 'notepad.jsonl'));
    expect(countNotepadLines(root, 'flow')).toBe(0);
  },
);
