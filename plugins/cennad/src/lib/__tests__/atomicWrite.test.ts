import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { atomicWrite } from '../atomicWrite.js';

describe('atomicWrite', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cennad-atomic-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes file with intended content', async () => {
    const target = join(dir, 'a.json');
    await atomicWrite(target, '{"x":1}');
    expect(await readFile(target, 'utf8')).toBe('{"x":1}');
  });

  it('creates intermediate directories', async () => {
    const target = join(dir, 'nested', 'deep', 'b.txt');
    await atomicWrite(target, 'hi');
    expect(await readFile(target, 'utf8')).toBe('hi');
  });

  it('does not leave .tmp artifacts behind on success', async () => {
    const target = join(dir, 'c.txt');
    await atomicWrite(target, 'ok');
    const entries = await readdir(dir);
    expect(entries.filter((e) => e.endsWith('.tmp'))).toEqual([]);
  });

  it('overwrites existing file atomically', async () => {
    const target = join(dir, 'd.txt');
    await atomicWrite(target, 'one');
    await atomicWrite(target, 'two');
    expect(await readFile(target, 'utf8')).toBe('two');
  });
});
