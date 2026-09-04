import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { handleSettings } from '../settings.js';

describe('settings action dispatch', () => {
  const tempDirs: string[] = [];
  const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;

  beforeAll(() => {
    process.env.CLAUDE_PLUGIN_ROOT = fileURLToPath(
      new URL('../../../../../', import.meta.url),
    );
  });

  afterAll(() => {
    if (originalPluginRoot === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
    else process.env.CLAUDE_PLUGIN_ROOT = originalPluginRoot;
  });

  afterEach(() => {
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function seedRepo(): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'seiri-settings-'));
    tempDirs.push(repoRoot);
    mkdirSync(join(repoRoot, '.git'));
    return repoRoot;
  }

  it('preserves each headless discriminator and applies only sync', async () => {
    const project_root = seedRepo();

    const status = await handleSettings({ action: 'status', project_root });
    expect(status.action).toBe('status');
    if (status.action !== 'status') throw new Error('expected status output');

    const manifest = await handleSettings({ action: 'manifest', project_root });
    expect(manifest.action).toBe('manifest');
    if (manifest.action !== 'manifest')
      throw new Error('expected manifest output');

    const selectedRule = manifest.manifest.rules[0];
    if (!selectedRule) throw new Error('manifest must contain a rule');
    const selectedStatus = status.entries.find(
      (entry) => entry.id === selectedRule.id,
    );
    if (!selectedStatus)
      throw new Error('status must contain the selected rule');
    const selections = { [selectedRule.id]: true };

    const plan = await handleSettings({
      action: 'plan',
      project_root,
      selections,
      resync: [],
    });
    expect(plan.action).toBe('plan');
    if (plan.action !== 'plan') throw new Error('expected plan output');
    expect(plan.result.applied).toBe(false);

    const sync = await handleSettings({
      action: 'sync',
      project_root,
      selections,
      resync: [],
      revision: plan.result.revision,
    });
    expect(sync.action).toBe('sync');
    if (sync.action !== 'sync') throw new Error('expected sync output');
    expect(sync.result.applied).toBe(true);
    expect(existsSync(selectedStatus.target)).toBe(true);
  });
});
