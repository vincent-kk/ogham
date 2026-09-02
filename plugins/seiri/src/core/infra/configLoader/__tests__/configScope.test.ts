import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../loaders/loadConfig.js';
import { loadConfigScope } from '../loaders/loadConfigScope.js';
import { loadIntervention } from '../loaders/loadIntervention.js';
import { writeConfig } from '../loaders/writeConfig.js';
import { writeRuntime } from '../loaders/writeRuntime.js';

/**
 * The dial now resolves across three layers: a personal user default, the
 * committed project baseline above it, and the session valve above both.
 * These cases pin the ordering and the isolation between the two stored
 * layers — that writing one never disturbs the other, and that a project
 * dial keeps outranking a personal one.
 */
describe('dial namespaces', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function seedRepo(): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'seiri-scope-'));
    tempDirs.push(repoRoot);
    mkdirSync(join(repoRoot, '.git'));
    return repoRoot;
  }

  it('falls back to the default when neither layer has a dial', () => {
    expect(loadIntervention(seedRepo())).toMatchObject({
      effective: 'off',
      source: 'default',
      user: null,
      baseline: null,
    });
  });

  it('uses the user layer when the project has none', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'user', { intervention: 'strict' });

    expect(loadIntervention(repoRoot)).toMatchObject({
      effective: 'strict',
      source: 'user',
      user: 'strict',
      baseline: null,
    });
  });

  it("lets the committed project dial outrank a person's default", () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'user', { intervention: 'strict' });
    writeConfig(repoRoot, 'project', { intervention: 'advisory' });

    expect(loadIntervention(repoRoot)).toMatchObject({
      effective: 'advisory',
      source: 'baseline',
      user: 'strict',
      baseline: 'advisory',
    });
  });

  it('lets the session valve outrank both stored layers', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'user', { intervention: 'strict' });
    writeConfig(repoRoot, 'project', { intervention: 'standard' });
    writeRuntime(repoRoot, 'advisory');

    expect(loadIntervention(repoRoot)).toMatchObject({
      effective: 'advisory',
      source: 'runtime',
    });
  });

  it('writes the user layer outside the repository', () => {
    const repoRoot = seedRepo();
    const written = writeConfig(repoRoot, 'user', { intervention: 'strict' });

    expect(written.startsWith(repoRoot)).toBe(false);
    expect(JSON.parse(readFileSync(written, 'utf8'))).toEqual({
      intervention: 'strict',
    });
  });

  it('writes the project layer inside .seiri and keeps the two apart', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'user', { intervention: 'strict' });
    const written = writeConfig(repoRoot, 'project', {
      intervention: 'advisory',
    });

    expect(written).toBe(join(repoRoot, '.seiri', 'config.json'));
    expect(loadConfig(repoRoot, 'user').config).toEqual({
      intervention: 'strict',
    });
    expect(loadConfig(repoRoot, 'project').config).toEqual({
      intervention: 'advisory',
    });
  });

  it('reports the project layer as the overriding one', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'user', { intervention: 'strict' });
    writeConfig(repoRoot, 'project', { intervention: 'advisory' });

    const scope = loadConfigScope(repoRoot);
    expect(scope.overridden).toEqual(['intervention']);
    expect(scope.layers.user).toEqual({ intervention: 'strict' });
    expect(scope.layers.project).toEqual({ intervention: 'advisory' });
  });

  it('reports nothing overridden when only the user layer has a dial', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'user', { intervention: 'strict' });

    expect(loadConfigScope(repoRoot).overridden).toEqual([]);
  });
});
