import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readHarvestManifest } from '../readHarvestManifest.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-manifest-'));
  mkdirSync(join(root, '.filid'));
  writeFileSync(join(root, '.filid', 'config.json'), '{}');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('readHarvestManifest', () => {
  it('reads the manifest from the normalized branch directory (spike/x → spike--x)', () => {
    const dir = join(root, '.filid', 'harvest', 'spike--x');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'manifest.json'),
      JSON.stringify({
        base_sha: 'b'.repeat(40),
        head_sha: 'h'.repeat(40),
        diff_hash: 'd'.repeat(64),
        criteria_delta_hash: 'c'.repeat(64),
        created_at: '2026-06-12T00:00:00Z',
      }),
    );
    expect(readHarvestManifest(root, 'spike/x')?.head_sha).toBe('h'.repeat(40));
  });

  it('drops non-string fields instead of failing (per-field sanitize)', () => {
    const dir = join(root, '.filid', 'harvest', 'spike--x');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'manifest.json'),
      JSON.stringify({ head_sha: 'h'.repeat(40), created_at: 1760000000 }),
    );
    const manifest = readHarvestManifest(root, 'spike/x');
    expect(manifest?.head_sha).toBe('h'.repeat(40));
    expect(manifest?.created_at).toBeUndefined();
  });

  it('returns null when the manifest is absent or unparsable', () => {
    expect(readHarvestManifest(root, 'spike/x')).toBeNull();
    const dir = join(root, '.filid', 'harvest', 'spike--x');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'manifest.json'), '{not json');
    expect(readHarvestManifest(root, 'spike/x')).toBeNull();
  });
});
