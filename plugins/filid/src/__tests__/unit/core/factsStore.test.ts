import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  readFactsStore,
  resolveFactsStorePaths,
  writeFactsShardFile,
} from '../../../core/facts/index.js';

const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;
const PROJECT_ROOT = '/project-under-test';

/**
 * A stored record for one path.
 * @param path Project-relative path the record describes.
 * @returns A record matching the stored schema.
 */
const record = (path: string): unknown => ({
  schemaVersion: 1,
  resolutionEpoch: 'sha256:epoch',
  rejectedClaims: 0,
  facts: {
    schemaVersion: 1,
    path,
    contentHash: `sha256:${'0'.repeat(64)}`,
    references: [],
    provenance: {
      tool: 't',
      version: '1',
      command: '',
      tier: 'tool',
      resolutionInputs: [],
    },
  },
});

let stateRoot: string;
let paths: ReturnType<typeof resolveFactsStorePaths>;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-store-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  paths = resolveFactsStorePaths(PROJECT_ROOT);
});

afterEach(() => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR;
  rmSync(stateRoot, { recursive: true, force: true });
});

/**
 * Write one record into its shard, reading the store for the current token.
 * @param path Project-relative path the record describes.
 * @returns Whether the shard write landed.
 */
function store(path: string): boolean {
  const key = paths.pathDigest(path);
  const shard = paths.shardFileName(key);
  const existing = readFactsStore(paths.directory).shards.get(shard);
  return writeFactsShardFile(
    paths.directory,
    shard,
    { ...(existing?.entries ?? {}), [key]: record(path) },
    existing?.digest ?? null,
  );
}

describe('facts record store', () => {
  it('keeps records under the project cache directory, never in the project', () => {
    expect(paths.directory.startsWith(stateRoot)).toBe(true);
    expect(paths.directory).not.toContain(PROJECT_ROOT);
  });

  it('keys a record by digest, not by the path it describes', () => {
    const key = paths.pathDigest('src/deeply/nested/thing.ts');

    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain('thing');
  });

  it('files records into shards named by the digest prefix', () => {
    const key = paths.pathDigest('src/a.ts');

    expect(paths.shardFileName(key)).toBe(`${key.slice(0, 2)}.json`);
  });

  it('stores and reads back a record', () => {
    expect(store('src/a.ts')).toBe(true);

    const contents = readFactsStore(paths.directory);
    expect(contents.records.get(paths.pathDigest('src/a.ts'))).toBeDefined();
  });

  it('keeps many records in far fewer files than records', () => {
    for (let index = 0; index < 60; index += 1) store(`src/file${index}.ts`);

    const contents = readFactsStore(paths.directory);
    expect(contents.records.size).toBe(60);
    expect(readdirSync(paths.directory).length).toBeLessThan(60);
  });

  it('refuses a shard write whose expected digest no longer matches', () => {
    store('src/a.ts');
    const shard = paths.shardFileName(paths.pathDigest('src/a.ts'));

    const written = writeFactsShardFile(
      paths.directory,
      shard,
      {},
      'a-digest-nobody-wrote',
    );

    expect(written).toBe(false);
  });

  it('preserves the other records in a shard when one is replaced', () => {
    const keys = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
    for (const path of keys) store(path);

    store('src/a.ts');

    const contents = readFactsStore(paths.directory);
    expect(contents.records.size).toBe(3);
  });

  it('reads one off-schema entry as absent while its shard stays writable', () => {
    store('src/a.ts');
    store('src/b.ts');
    const key = paths.pathDigest('src/a.ts');
    const shard = paths.shardFileName(key);
    const existing = readFactsStore(paths.directory).shards.get(shard);
    writeFactsShardFile(
      paths.directory,
      shard,
      { ...(existing?.entries ?? {}), [key]: { nonsense: true } },
      existing?.digest ?? null,
    );

    const contents = readFactsStore(paths.directory);

    expect(contents.records.has(key)).toBe(false);
    expect(store('src/a.ts')).toBe(true);
    expect(readFactsStore(paths.directory).records.has(key)).toBe(true);
  });

  it('reads a shard with unparseable JSON as empty while keeping its write token', () => {
    store('src/a.ts');
    const key = paths.pathDigest('src/a.ts');
    const shard = paths.shardFileName(key);
    writeFileSync(join(paths.directory, shard), 'not json at all');

    const contents = readFactsStore(paths.directory);

    expect(contents.records.has(key)).toBe(false);
    expect(contents.shards.get(shard)?.digest).toBeTypeOf('string');
    expect(store('src/a.ts')).toBe(true);
  });

  it('ignores files in the store directory that are not shards', () => {
    store('src/a.ts');
    writeFileSync(
      join(paths.directory, 'epoch.json'),
      '{"resolutionEpoch":"x"}',
    );

    expect(readFactsStore(paths.directory).records.size).toBe(1);
    expect(readdirSync(paths.directory)).toHaveLength(2);
  });

  it('reads an absent store as empty rather than failing', () => {
    const contents = readFactsStore(join(stateRoot, 'nothing-here'));

    expect(contents.records.size).toBe(0);
    expect(contents.shards.size).toBe(0);
  });
});
