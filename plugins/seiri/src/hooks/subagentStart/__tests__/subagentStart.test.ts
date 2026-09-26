import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import { loadManifest } from '../../../core/ruleDocs/loaders/loadManifest.js';
import { applyRuleDocs } from '../../../core/ruleDocs/sync/applyRuleDocs.js';
import type { InterventionLevel } from '../../../types/config.js';
import {
  activateWorkflow,
  observeBash,
} from '../../__tests__/helpers/workflowHarness.js';
import { processSubagentStart } from '../subagentStart.js';

/** Environment variable hooks read the plugin install directory from. */
const ENV_PLUGIN_ROOT = 'CLAUDE_PLUGIN_ROOT';
/** Canonical rule package used only to seed deployed-rule fixtures. */
const pluginRoot = fileURLToPath(new URL('../../../../', import.meta.url));
/** A deployed rule verifies that discovery does not cause a status banner. */
const anchor = loadManifest(pluginRoot).rules[0];
/** Fixture repositories owned by this suite. */
const roots: string[] = [];
/** Ambient plugin location restored after every case. */
let previousPluginRoot: string | undefined;

beforeEach(() => {
  previousPluginRoot = process.env[ENV_PLUGIN_ROOT];
  process.env[ENV_PLUGIN_ROOT] = pluginRoot;
});
afterEach(() => {
  if (previousPluginRoot === undefined) delete process.env[ENV_PLUGIN_ROOT];
  else process.env[ENV_PLUGIN_ROOT] = previousPluginRoot;
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/** Create a project with optional deployed rules and the requested dial. */
function seedRepo(intervention: InterventionLevel, deploy = true): string {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-subagent-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  writeConfig(root, 'project', { intervention });
  if (deploy) applyRuleDocs(root, pluginRoot, [anchor?.id ?? '']);
  return root;
}

/** A native child boundary supplies provenance without selecting its task. */
function spawn(cwd: string) {
  return processSubagentStart({
    cwd,
    session_id: 'session-a',
    prompt_id: 'turn-a',
    agent_id: 'child-a',
    hook_event_name: 'SubagentStart',
  });
}

describe('silent child actor boundary', () => {
  it.each(['off', 'advisory', 'standard', 'strict'] as const)(
    'does not reinject rules or elect skills at %s',
    (dial) => {
      expect(spawn(seedRepo(dial))).toEqual({ continue: true });
    },
  );

  it('does not elect when the project deployed no rules', () => {
    expect(spawn(seedRepo('strict', false))).toEqual({ continue: true });
  });

  it('does not inherit the parent task', () => {
    const cwd = seedRepo('standard');
    activateWorkflow(cwd);
    spawn(cwd);
    for (let index = 0; index < 3; index++)
      expect(
        observeBash({
          cwd,
          session_id: 'session-a',
          agent_id: 'child-a',
          hook_event_name: 'PostToolUseFailure',
          tool_name: 'Bash',
          tool_input: { command: 'fail' },
          error: 'Exit code 1',
        }),
      ).toEqual({ continue: true });
  });

  it('permits explicit child participation without a plugin-root environment', () => {
    const cwd = seedRepo('strict');
    delete process.env[ENV_PLUGIN_ROOT];
    expect(
      activateWorkflow(cwd, { agent_id: 'child-a' }).hookSpecificOutput
        ?.additionalContext,
    ).toContain('payment-refactor');
  });
});
