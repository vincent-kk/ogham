import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ENV_PLUGIN_ROOT } from '../../../constants/env.js';
import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import { loadManifest } from '../../../core/ruleDocs/loaders/loadManifest.js';
import { applyRuleDocs } from '../../../core/ruleDocs/sync/applyRuleDocs.js';
import type { InterventionLevel } from '../../../types/config.js';
import { processSubagentStart } from '../subagentStart.js';

const pluginRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const anchor = loadManifest(pluginRoot).rules[0];

/**
 * A subagent starts without the parent's SessionStart context, so it does
 * not know which rules this repository turned on. This hook re-states
 * that — and only that. It stays a pointer, never a copy: the rule files
 * are readable from inside a subagent too.
 */
describe('subagent status re-injection', () => {
  const tempDirs: string[] = [];
  let previousPluginRoot: string | undefined;

  beforeEach(() => {
    previousPluginRoot = process.env[ENV_PLUGIN_ROOT];
    process.env[ENV_PLUGIN_ROOT] = pluginRoot;
  });

  afterEach(() => {
    if (previousPluginRoot === undefined) delete process.env[ENV_PLUGIN_ROOT];
    else process.env[ENV_PLUGIN_ROOT] = previousPluginRoot;
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function seedRepo(intervention: InterventionLevel, deploy = true): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'seiri-subagent-'));
    tempDirs.push(repoRoot);
    mkdirSync(join(repoRoot, '.git'));
    writeConfig(repoRoot, 'project', { intervention });
    if (deploy) applyRuleDocs(repoRoot, pluginRoot, [anchor?.id ?? '']);
    return repoRoot;
  }

  function spawn(cwd: string): string[] {
    const output = processSubagentStart({
      cwd,
      session_id: 'session-a',
      hook_event_name: 'SubagentStart',
    });
    expect(output.continue).toBe(true);
    const context = output.hookSpecificOutput?.additionalContext;
    return context === undefined ? [] : context.split('\n');
  }

  it('stays out of a subagent entirely at advisory', () => {
    expect(spawn(seedRepo('advisory'))).toEqual([]);
  });

  it('hands the subagent the active rules and the standard election line', () => {
    const lines = spawn(seedRepo('standard'));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Active rules');
    expect(lines[0]).toContain('.claude/rules/');
    expect(lines[1]).toContain('Election:');
    // Standard names exactly one moment's owner — the done-claim, whoever
    // makes it — and leaves the rest as procedure. Strict is where every
    // moment gets its skill.
    expect(lines[1]).toContain('/seiri:verify');
    expect(lines[1]).toContain('said or heard');
    expect(lines[1]).toContain("user's");
    expect(lines[1]).not.toContain('/seiri:trace-cause');
    // Election is forced; adoption stays with the model.
    expect(lines[1]).toContain('deviations are yours to make');
  });

  it("names each moment's owning skill at strict, kept short", () => {
    const lines = spawn(seedRepo('strict'));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('Election contract:');
    expect(lines[1]).toContain('seiri:trace-cause');
    expect(lines[1]).toContain('seiri:verify');
    expect(lines[1]).toContain('said or heard');
    expect(lines.some((line) => line.includes('Precedence'))).toBe(false);
  });

  it('still elects when the project deployed no rules', () => {
    const lines = spawn(seedRepo('strict', false));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Election contract:');
    expect(lines.some((line) => line.includes('Active rules'))).toBe(false);
  });

  it('never blocks a spawn when it cannot locate the plugin', () => {
    const repoRoot = seedRepo('strict');
    delete process.env[ENV_PLUGIN_ROOT];
    expect(spawn(repoRoot)).toEqual([]);
  });
});
