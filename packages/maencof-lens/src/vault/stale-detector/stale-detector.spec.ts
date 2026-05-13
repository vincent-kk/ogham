import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleLensStatus } from '../../tools/lens-status/lens-status.js';
import { detectStale } from './stale-detector.js';

let vault: string;

function maencofDir(): string {
  const dir = join(vault, '.maencof');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeWithMtime(path: string, content: string, mtimeMs: number): void {
  writeFileSync(path, content);
  const time = mtimeMs / 1000;
  utimesSync(path, time, time);
}

beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), 'lens-stale-'));
});

afterEach(() => {
  rmSync(vault, { recursive: true, force: true });
});

describe('detectStale — basic', () => {
  it('reports fresh when graph-meta is newer than the latest markdown', async () => {
    const dir = maencofDir();
    const past = Date.now() - 60_000;
    writeWithMtime(join(vault, 'note.md'), '# old', past);
    writeWithMtime(join(dir, 'graph-meta.json'), '{}', Date.now());

    const info = await detectStale(vault);

    expect(info.isStale).toBe(false);
    expect(info.markerKind).toBe('graph-meta');
  });

  it('reports legacy v1 (non-fresh) when only index.json exists', async () => {
    const dir = maencofDir();
    writeFileSync(join(dir, 'index.json'), '{}');

    const info = await detectStale(vault);

    expect(info.markerKind).toBe('legacy');
    expect(info.isStale).toBe(true);
    expect(info.staleSince).toBe('legacy v1');
  });

  it('reports index not found when no marker exists', async () => {
    maencofDir();

    const info = await detectStale(vault);

    expect(info.markerKind).toBeNull();
    expect(info.isStale).toBe(true);
    expect(info.staleSince).toBe('index not found');
  });
});

describe('detectStale — complex', () => {
  it('reports stale when latest markdown is newer than graph-meta', async () => {
    const dir = maencofDir();
    const old = Date.now() - 60 * 60 * 1000;
    writeWithMtime(join(dir, 'graph-meta.json'), '{}', old);
    writeWithMtime(join(vault, 'fresh.md'), '# new', Date.now());

    const info = await detectStale(vault);

    expect(info.markerKind).toBe('graph-meta');
    expect(info.isStale).toBe(true);
    expect(info.staleSince).toBeDefined();
  });

  it('prefers graph-meta when both markers coexist', async () => {
    const dir = maencofDir();
    writeFileSync(join(dir, 'index.json'), '{}');
    writeWithMtime(join(dir, 'graph-meta.json'), '{}', Date.now());

    const info = await detectStale(vault);

    expect(info.markerKind).toBe('graph-meta');
    expect(info.isStale).toBe(false);
  });

  it('populates markerKind on every branch', async () => {
    const dir = maencofDir();
    let info = await detectStale(vault);
    expect(info.markerKind).toBeNull();

    writeFileSync(join(dir, 'index.json'), '{}');
    info = await detectStale(vault);
    expect(info.markerKind).toBe('legacy');

    writeFileSync(join(dir, 'graph-meta.json'), '{}');
    info = await detectStale(vault);
    expect(info.markerKind).toBe('graph-meta');
  });

  it('lens-status emits a v1 migration warning for legacy markers', async () => {
    const dir = maencofDir();
    writeFileSync(join(dir, 'index.json'), '{}');

    const output = await handleLensStatus(vault, null);
    expect(typeof output.staleWarning).toBe('string');
    expect(output.staleWarning).toMatch(/legacy v1/i);
    expect(output.markerKind).toBeUndefined();
  });
});
