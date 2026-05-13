import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createDefaultConfig,
  writeConfig,
} from '../../config/config-loader/config-loader.js';
import { runSessionStart } from './session-start.js';

let workDir: string;
let vault: string;

function maencofDir(): string {
  const dir = join(vault, '.maencof');
  mkdirSync(dir, { recursive: true });
  return dir;
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'lens-ss-cwd-'));
  vault = mkdtempSync(join(tmpdir(), 'lens-ss-vault-'));
  const config = createDefaultConfig(vault, 'test-vault');
  writeConfig(workDir, config);
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
  rmSync(vault, { recursive: true, force: true });
});

describe('runSessionStart — basic', () => {
  it('renders ready when graph-meta marker is present and fresh', async () => {
    const dir = maencofDir();
    writeFileSync(join(dir, 'graph-meta.json'), '{}');

    const result = await runSessionStart(workDir);
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toMatch(/— ready/);
  });

  it('renders "index not built" when no marker exists', async () => {
    maencofDir();

    const result = await runSessionStart(workDir);
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toMatch(/— index not built/);
  });
});

describe('runSessionStart — complex', () => {
  it('renders "legacy v1" label for legacy-only marker', async () => {
    const dir = maencofDir();
    writeFileSync(join(dir, 'index.json'), '{}');

    const result = await runSessionStart(workDir);
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toMatch(/— legacy v1/);
  });

  it('renders [default] tag for the default vault entry', async () => {
    const dir = maencofDir();
    writeFileSync(join(dir, 'graph-meta.json'), '{}');

    const result = await runSessionStart(workDir);
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toContain('[default]');
  });
});
