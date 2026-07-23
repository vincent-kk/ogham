import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { writeConfig } from '../../../../core/infra/configLoader/loaders/writeConfig.js';
import { handleRuleDocsSync } from '../ruleDocsSync.js';

/**
 * The dial's conversational surface. `set` and `clear` are the opt-out the
 * pre-emptive wiring promises, so what matters here is that the tool
 * result itself states the posture now in effect — the call is the only
 * moment the session learns the dial moved.
 */
describe('rule_docs_sync config action', () => {
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

  function call(project_root: string, extra: Record<string, unknown> = {}) {
    const result = handleRuleDocsSync({
      action: 'config',
      project_root,
      ...extra,
    });
    if (result.action !== 'config') throw new Error('expected a config result');
    return result;
  }

  it('reports the dial without touching anything', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, { intervention: 'standard' });

    const result = call(repoRoot);
    expect(result.op).toBe('get');
    expect(result.changed).toBe(false);
    expect(result.dial).toMatchObject({
      effective: 'standard',
      source: 'baseline',
    });
    expect(existsSync(join(repoRoot, '.seiri', 'runtime.json'))).toBe(false);
  });

  it('turns the valve and states the posture that is now in effect', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, { intervention: 'advisory' });

    const result = call(repoRoot, { config_op: 'set', intervention: 'strict' });
    expect(result.changed).toBe(true);
    expect(result.dial).toMatchObject({
      effective: 'strict',
      source: 'runtime',
    });
    expect(result.posture).toContain('strict');
    expect(result.posture).toContain('runtime');
    expect(result.posture).toContain('baseline: advisory');
  });

  it('restores the baseline on clear, and says when there was nothing to clear', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, { intervention: 'standard' });
    call(repoRoot, { config_op: 'set', intervention: 'advisory' });

    const cleared = call(repoRoot, { config_op: 'clear' });
    expect(cleared.changed).toBe(true);
    expect(cleared.dial).toMatchObject({
      effective: 'standard',
      source: 'baseline',
    });

    expect(call(repoRoot, { config_op: 'clear' }).changed).toBe(false);
  });

  it('refuses a set without a valid dial position rather than storing junk', () => {
    const repoRoot = seedRepo();
    expect(() => call(repoRoot, { config_op: 'set' })).toThrow(/intervention/);
    expect(() =>
      call(repoRoot, { config_op: 'set', intervention: 'loud' }),
    ).toThrow(/intervention/);
    expect(existsSync(join(repoRoot, '.seiri', 'runtime.json'))).toBe(false);
  });

  it('never writes the committed baseline — that stays a setup-surface act', () => {
    const repoRoot = seedRepo();
    call(repoRoot, { config_op: 'set', intervention: 'strict' });

    expect(existsSync(join(repoRoot, '.seiri', 'config.json'))).toBe(false);
    expect(call(repoRoot).dial.baseline).toBeNull();
  });
});
