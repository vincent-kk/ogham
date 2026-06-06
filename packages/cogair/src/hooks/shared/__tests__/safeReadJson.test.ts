import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { safeReadJson } from '../safeReadJson.js';

let dir: string;

beforeEach(async () => {
  const { mkdtemp } = await import('node:fs/promises');
  dir = await mkdtemp(join(tmpdir(), 'safeReadJson-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('safeReadJson', () => {
  it('returns parsed object for a valid JSON file', async () => {
    const path = join(dir, 'valid.json');
    await writeFile(path, JSON.stringify({ key: 'value', num: 42 }));
    expect(safeReadJson(path)).toEqual({ key: 'value', num: 42 });
  });

  it('returns parsed array for a valid JSON array file', async () => {
    const path = join(dir, 'array.json');
    await writeFile(path, JSON.stringify([1, 2, 3]));
    expect(safeReadJson(path)).toEqual([1, 2, 3]);
  });

  it('returns parsed primitive string for a JSON string file', async () => {
    const path = join(dir, 'string.json');
    await writeFile(path, JSON.stringify('hello'));
    expect(safeReadJson<string>(path)).toBe('hello');
  });

  it('returns null when the file does not exist', () => {
    const path = join(dir, 'nonexistent.json');
    expect(safeReadJson(path)).toBeNull();
  });

  it('returns null for malformed JSON', async () => {
    const path = join(dir, 'malformed.json');
    await writeFile(path, '{not valid json');
    expect(safeReadJson(path)).toBeNull();
  });

  it('returns null for an empty file', async () => {
    const path = join(dir, 'empty.json');
    await writeFile(path, '');
    expect(safeReadJson(path)).toBeNull();
  });

  it('returns null for a file containing only whitespace', async () => {
    const path = join(dir, 'whitespace.json');
    await writeFile(path, '   \n  ');
    expect(safeReadJson(path)).toBeNull();
  });

  it('returns null when path points to a directory', async () => {
    const subdir = join(dir, 'subdir');
    await mkdir(subdir);
    expect(safeReadJson(subdir)).toBeNull();
  });

  it('preserves nested objects', async () => {
    const path = join(dir, 'nested.json');
    const data = { a: { b: { c: true } } };
    await writeFile(path, JSON.stringify(data));
    expect(safeReadJson(path)).toEqual(data);
  });

  it('returns null for truncated JSON', async () => {
    const path = join(dir, 'truncated.json');
    await writeFile(path, '{"key": "val');
    expect(safeReadJson(path)).toBeNull();
  });
});
