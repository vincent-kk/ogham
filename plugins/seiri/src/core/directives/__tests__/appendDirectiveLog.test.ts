import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import {
  ensureDirectorySync,
  portableJoin,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, expect, it } from 'vitest';

import { appendDirectiveLog } from '../utils/appendDirectiveLog.js';

let root: string;
let directory: string;
let notepad: string;
const now = Date.UTC(2026, 4, 6, 7, 8, 9, 10);

beforeEach(() => {
  root = mkdtempSync(portableJoin(tmpdir(), 'seiri-append-log-'));
  directory = portableJoin(root, '.seiri', 'directives', 'flow');
  notepad = portableJoin(directory, 'notepad.jsonl');
  ensureDirectorySync(directory);
  writeFileAtomicallySync(portableJoin(directory, 'focus.md'), 'focus');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

it('appends one newline-terminated JSON line stamped with the supplied time', () => {
  expect(appendDirectiveLog(root, 'flow', 'notepad', 'first', now)).toBe(true);
  expect(readFileSync(notepad, 'utf8')).toBe(
    '{"at":"2026-05-06T07:08:09.010Z","text":"first"}\n',
  );
});

it('stores text containing line breaks on a single line', () => {
  appendDirectiveLog(root, 'flow', 'history', 'a\nb\r\nc', now);
  const body = readFileSync(portableJoin(directory, 'history.jsonl'), 'utf8');
  expect(body.split('\n')).toHaveLength(2);
  expect(JSON.parse(body)).toEqual({
    at: new Date(now).toISOString(),
    text: 'a\nb\r\nc',
  });
});

it('keeps the bytes of earlier lines when appending again', () => {
  appendDirectiveLog(root, 'flow', 'notepad', 'first', now);
  const before = readFileSync(notepad);
  appendDirectiveLog(root, 'flow', 'notepad', 'second', now + 1);
  const after = readFileSync(notepad);
  expect(after.subarray(0, before.length).equals(before)).toBe(true);
  expect(after.toString('utf8').trimEnd().split('\n')).toHaveLength(2);
});

it('starts a new line when the existing file does not end with a line break', () => {
  writeFileSync(notepad, '{"at":"x","text":"old"}');
  appendDirectiveLog(root, 'flow', 'notepad', 'new', now);
  const lines = readFileSync(notepad, 'utf8').split('\n');
  expect(lines[0]).toBe('{"at":"x","text":"old"}');
  expect(JSON.parse(lines[1] ?? '')).toMatchObject({ text: 'new' });
  expect(lines).toHaveLength(3);
});

it('does not write through a symbolic link and leaves its target unchanged', () => {
  const target = portableJoin(root, 'outside.jsonl');
  writeFileSync(target, 'untouched');
  symlinkSync(target, notepad);
  expect(appendDirectiveLog(root, 'flow', 'notepad', 'x', now)).toBe(false);
  expect(readFileSync(target, 'utf8')).toBe('untouched');
});

it('does not write and returns false while the set lock is held', () => {
  ensureDirectorySync(portableJoin(directory, 'binding.lock'));
  expect(appendDirectiveLog(root, 'flow', 'notepad', 'x', now)).toBe(false);
  expect(lstatSync(notepad, { throwIfNoEntry: false })).toBeUndefined();
});

it('does not revive a deleted set or write into a set with no directive files', () => {
  rmSync(portableJoin(directory, 'focus.md'));
  expect(appendDirectiveLog(root, 'flow', 'notepad', 'x', now)).toBe(false);
  expect(lstatSync(notepad, { throwIfNoEntry: false })).toBeUndefined();
  rmSync(directory, { recursive: true });
  expect(appendDirectiveLog(root, 'flow', 'notepad', 'x', now)).toBe(false);
  expect(lstatSync(directory, { throwIfNoEntry: false })).toBeUndefined();
});

it('appends to a set that has no entry document', () => {
  expect(appendDirectiveLog(root, 'flow', 'history', 'note', now)).toBe(true);
  expect(
    lstatSync(portableJoin(directory, 'index.md'), { throwIfNoEntry: false }),
  ).toBeUndefined();
});

it('rejects a clock value that is not a finite number', () => {
  for (const bad of [Number.NaN, Infinity])
    expect(() => appendDirectiveLog(root, 'flow', 'notepad', 'x', bad)).toThrow(
      RangeError,
    );
});

it('returns false instead of throwing when a directory sits at the target', () => {
  mkdirSync(notepad);
  expect(appendDirectiveLog(root, 'flow', 'notepad', 'x', now)).toBe(false);
});
