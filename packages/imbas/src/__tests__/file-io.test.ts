import { describe, expect, it, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { readJson, writeJson } from '../lib/file-io.js';

const dirs: string[] = [];

function makeTempDir(): string {
  const dir = join(tmpdir(), `imbas-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }
});

// --- readJson ---

describe('readJson', () => {
  it('reads valid JSON file', async () => {
    const dir = makeTempDir();
    const file = join(dir, 'data.json');
    writeFileSync(file, JSON.stringify({ hello: 'world' }), 'utf-8');

    const result = await readJson<{ hello: string }>(file);
    expect(result).toEqual({ hello: 'world' });
  });

  it('throws on missing file', async () => {
    const dir = makeTempDir();
    const file = join(dir, 'nonexistent.json');
    await expect(readJson(file)).rejects.toThrow('Failed to read file');
  });

  it('throws on invalid JSON', async () => {
    const dir = makeTempDir();
    const file = join(dir, 'bad.json');
    writeFileSync(file, 'not valid json', 'utf-8');
    await expect(readJson(file)).rejects.toThrow('Invalid JSON in file');
  });

  it('validates with schema and returns typed data', async () => {
    const dir = makeTempDir();
    const file = join(dir, 'typed.json');
    writeFileSync(file, JSON.stringify({ name: 'test', count: 42 }), 'utf-8');

    const schema = z.object({ name: z.string(), count: z.number() });
    const result = await readJson(file, schema);
    expect(result.name).toBe('test');
    expect(result.count).toBe(42);
  });

  it('throws when schema validation fails', async () => {
    const dir = makeTempDir();
    const file = join(dir, 'invalid.json');
    writeFileSync(file, JSON.stringify({ name: 123 }), 'utf-8');

    const schema = z.object({ name: z.string() });
    await expect(readJson(file, schema)).rejects.toThrow('Schema validation failed');
  });

  it('reads nested object without schema', async () => {
    const dir = makeTempDir();
    const file = join(dir, 'nested.json');
    const data = { a: { b: { c: 'deep' } } };
    writeFileSync(file, JSON.stringify(data), 'utf-8');

    const result = await readJson<typeof data>(file);
    expect(result.a.b.c).toBe('deep');
  });
});

// --- writeJson ---

describe('writeJson', () => {
  it('creates file with JSON content', async () => {
    const dir = makeTempDir();
    const file = join(dir, 'output.json');
    await writeJson(file, { key: 'value' });

    const raw = readFileSync(file, 'utf-8');
    expect(JSON.parse(raw)).toEqual({ key: 'value' });
  });

  it('creates parent directories automatically', async () => {
    const dir = makeTempDir();
    const nested = join(dir, 'a', 'b', 'c', 'output.json');
    await writeJson(nested, { x: 1 });

    expect(existsSync(nested)).toBe(true);
  });

  it('overwrites existing file', async () => {
    const dir = makeTempDir();
    const file = join(dir, 'overwrite.json');
    writeFileSync(file, JSON.stringify({ old: true }), 'utf-8');

    await writeJson(file, { new: true });
    const raw = readFileSync(file, 'utf-8');
    expect(JSON.parse(raw)).toEqual({ new: true });
  });

  it('writes with pretty-print formatting', async () => {
    const dir = makeTempDir();
    const file = join(dir, 'pretty.json');
    await writeJson(file, { a: 1 });

    const raw = readFileSync(file, 'utf-8');
    expect(raw).toContain('\n');
    expect(raw).toContain('  ');
  });

  it('round-trips data through writeJson + readJson', async () => {
    const dir = makeTempDir();
    const file = join(dir, 'roundtrip.json');
    const data = { items: [1, 2, 3], flag: true, name: 'test' };

    await writeJson(file, data);
    const result = await readJson<typeof data>(file);
    expect(result).toEqual(data);
  });
});
