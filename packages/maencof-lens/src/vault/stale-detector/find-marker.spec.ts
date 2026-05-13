import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findIndexMarker } from './find-marker.js';

let vault: string;

function makeMaencofDir(): string {
  const dir = join(vault, '.maencof');
  mkdirSync(dir, { recursive: true });
  return dir;
}

beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), 'lens-marker-'));
});

afterEach(() => {
  rmSync(vault, { recursive: true, force: true });
});

describe('findIndexMarker — basic', () => {
  it('returns graph-meta when only graph-meta.json exists', () => {
    const dir = makeMaencofDir();
    writeFileSync(join(dir, 'graph-meta.json'), '{}');

    const result = findIndexMarker(vault);

    expect(result?.kind).toBe('graph-meta');
    expect(result?.path).toBe(join(dir, 'graph-meta.json'));
    expect(typeof result?.mtimeMs).toBe('number');
  });

  it('returns legacy when only index.json exists', () => {
    const dir = makeMaencofDir();
    writeFileSync(join(dir, 'index.json'), '{}');

    const result = findIndexMarker(vault);

    expect(result?.kind).toBe('legacy');
    expect(result?.path).toBe(join(dir, 'index.json'));
  });

  it('returns null when neither marker exists', () => {
    makeMaencofDir();
    expect(findIndexMarker(vault)).toBeNull();
  });
});

describe('findIndexMarker — complex', () => {
  it('prefers graph-meta when both files coexist', () => {
    const dir = makeMaencofDir();
    writeFileSync(join(dir, 'index.json'), '{}');
    writeFileSync(join(dir, 'graph-meta.json'), '{}');

    const result = findIndexMarker(vault);
    expect(result?.kind).toBe('graph-meta');
  });

  it('returns null when vault path itself does not exist', () => {
    const missing = join(tmpdir(), 'lens-marker-missing-' + Date.now());
    expect(findIndexMarker(missing)).toBeNull();
  });

  it('captures the marker file mtime', () => {
    const dir = makeMaencofDir();
    const path = join(dir, 'graph-meta.json');
    writeFileSync(path, '{}');

    const result = findIndexMarker(vault);
    expect(result?.mtimeMs).toBeGreaterThan(0);
  });
});
