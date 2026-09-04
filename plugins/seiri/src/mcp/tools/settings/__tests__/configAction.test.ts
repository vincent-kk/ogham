import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ELECTION_STRICT_LINE } from '../../../../constants/electionLines.js';
import { writeConfig } from '../../../../core/infra/configLoader/loaders/writeConfig.js';
import { handleSettings } from '../settings.js';

/**
 * The dial's conversational surface. `set` and `clear` are the opt-out the
 * pre-emptive wiring promises, so what matters here is that the tool
 * result itself states the posture now in effect — the call is the only
 * moment the session learns the dial moved.
 */
describe('settings config action', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function seedRepo(): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'seiri-config-action-'));
    tempDirs.push(repoRoot);
    mkdirSync(join(repoRoot, '.git'));
    return repoRoot;
  }

  async function call(
    project_root: string,
    extra: Record<string, unknown> = {},
  ) {
    const result = await handleSettings({
      action: 'config',
      project_root,
      ...extra,
    });
    if (result.action !== 'config') throw new Error('expected a config result');
    return result;
  }

  it('reports the dial without touching anything', async () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'project', { intervention: 'standard' });

    const result = await call(repoRoot);
    expect(result.op).toBe('get');
    expect(result.changed).toBe(false);
    expect(result.dial).toMatchObject({
      effective: 'standard',
      source: 'baseline',
    });
    expect(existsSync(join(repoRoot, '.seiri', 'runtime.json'))).toBe(false);
  });

  it('turns the valve and states the posture that is now in effect', async () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'project', { intervention: 'advisory' });

    const result = await call(repoRoot, {
      config_op: 'set',
      intervention: 'strict',
    });
    expect(result.changed).toBe(true);
    expect(result.dial).toMatchObject({
      effective: 'strict',
      source: 'runtime',
    });
    expect(result.posture).toContain('strict');
    expect(result.posture).toContain('runtime');
    expect(result.posture).toContain('baseline: advisory');
  });

  it('accepts off and reports only the explicit dial state', async () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'project', { intervention: 'standard' });

    const result = await call(repoRoot, {
      config_op: 'set',
      intervention: 'off',
    });
    expect(result.changed).toBe(true);
    expect(result.dial).toMatchObject({
      effective: 'off',
      source: 'runtime',
    });
    expect(result.posture).toBe(
      'Intervention: off (runtime; baseline: standard)',
    );
    expect(result.posture).not.toContain('Election');
    expect(result.posture).not.toContain('Workflow');
  });

  it('restores the baseline on clear, and says when there was nothing to clear', async () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'project', { intervention: 'standard' });
    await call(repoRoot, { config_op: 'set', intervention: 'advisory' });

    const cleared = await call(repoRoot, { config_op: 'clear' });
    expect(cleared.changed).toBe(true);
    expect(cleared.dial).toMatchObject({
      effective: 'standard',
      source: 'baseline',
    });

    expect((await call(repoRoot, { config_op: 'clear' })).changed).toBe(false);
  });

  it('carries the election line for the effective dial, and stays silent at advisory', async () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'project', { intervention: 'standard' });

    const strict = await call(repoRoot, {
      config_op: 'set',
      intervention: 'strict',
    });
    expect(strict.posture).toContain(ELECTION_STRICT_LINE);

    const advisory = await call(repoRoot, {
      config_op: 'set',
      intervention: 'advisory',
    });
    expect(advisory.posture).not.toContain('Election');
  });

  it('refuses a set without a valid dial position rather than storing junk', async () => {
    const repoRoot = seedRepo();
    await expect(call(repoRoot, { config_op: 'set' })).rejects.toThrow(
      /intervention/,
    );
    await expect(
      call(repoRoot, { config_op: 'set', intervention: 'loud' }),
    ).rejects.toThrow(/intervention/);
    expect(existsSync(join(repoRoot, '.seiri', 'runtime.json'))).toBe(false);
  });

  it('never writes the committed baseline — that stays a setup-surface act', async () => {
    const repoRoot = seedRepo();
    await call(repoRoot, { config_op: 'set', intervention: 'strict' });

    expect(existsSync(join(repoRoot, '.seiri', 'config.json'))).toBe(false);
    expect((await call(repoRoot)).dial.baseline).toBeNull();
  });
});
