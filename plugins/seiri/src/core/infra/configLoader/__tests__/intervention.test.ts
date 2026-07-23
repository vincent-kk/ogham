import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { clearRuntime } from '../loaders/clearRuntime.js';
import { loadIntervention } from '../loaders/loadIntervention.js';
import { writeConfig } from '../loaders/writeConfig.js';
import { writeRuntime } from '../loaders/writeRuntime.js';

/**
 * The dial is stored in two layers on purpose: a committed baseline the
 * repository declares, and an untracked valve a session can turn. These
 * cases pin the part that makes that split safe — which layer wins, that
 * lowering the valve never reaches a commit, and that a damaged valve
 * falls back to the baseline instead of taking the dial with it.
 */
describe('intervention dial', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function seedRepo(): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'seiri-dial-'));
    tempDirs.push(repoRoot);
    mkdirSync(join(repoRoot, '.git'));
    return repoRoot;
  }

  it('lets the runtime valve override the committed baseline', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, { intervention: 'standard' });
    writeRuntime(repoRoot, 'advisory');

    expect(loadIntervention(repoRoot)).toMatchObject({
      effective: 'advisory',
      source: 'runtime',
      baseline: 'standard',
      runtime: 'advisory',
    });
  });

  it('uses the baseline when no valve has been turned', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, { intervention: 'strict' });

    expect(loadIntervention(repoRoot)).toMatchObject({
      effective: 'strict',
      source: 'baseline',
      runtime: null,
    });
  });

  it('falls back to advisory when the project has neither layer', () => {
    expect(loadIntervention(seedRepo())).toMatchObject({
      effective: 'advisory',
      source: 'default',
      baseline: null,
      runtime: null,
    });
  });

  it('returns to the baseline once the valve is cleared', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, { intervention: 'standard' });
    writeRuntime(repoRoot, 'advisory');

    expect(clearRuntime(repoRoot)).toBe(true);
    expect(loadIntervention(repoRoot)).toMatchObject({
      effective: 'standard',
      source: 'baseline',
      runtime: null,
    });
    expect(clearRuntime(repoRoot)).toBe(false);
  });

  it('writes the ignore file that keeps the valve out of commits', () => {
    const repoRoot = seedRepo();
    writeRuntime(repoRoot, 'strict');

    const ignore = readFileSync(join(repoRoot, '.seiri', '.gitignore'), 'utf8');
    expect(ignore).toContain('runtime.json');
    expect(existsSync(join(repoRoot, '.seiri', 'runtime.json'))).toBe(true);
  });

  it('leaves an existing ignore file alone', () => {
    const repoRoot = seedRepo();
    mkdirSync(join(repoRoot, '.seiri'), { recursive: true });
    writeFileSync(join(repoRoot, '.seiri', '.gitignore'), '*\n', 'utf8');

    writeRuntime(repoRoot, 'strict');

    expect(readFileSync(join(repoRoot, '.seiri', '.gitignore'), 'utf8')).toBe(
      '*\n',
    );
  });

  it('falls back to the baseline when the valve is damaged, and says which file', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, { intervention: 'standard' });
    writeFileSync(join(repoRoot, '.seiri', 'runtime.json'), '{ oops', 'utf8');

    const state = loadIntervention(repoRoot);
    expect(state).toMatchObject({
      effective: 'standard',
      source: 'baseline',
      runtime: null,
    });
    expect(state.warnings).toHaveLength(1);
    expect(state.warnings[0]?.file).toContain('runtime.json');
  });
});
