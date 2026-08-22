import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ENV_PLUGIN_ROOT } from '../../constants/env.js';
import { writeConfig } from '../../core/infra/configLoader/loaders/writeConfig.js';
import type {
  SessionStartInput,
  SubagentStartInput,
  UserPromptSubmitInput,
} from '../../types/hooks.js';
import { processSessionStart } from '../setup/setup.js';
import { processSubagentStart } from '../subagentStart/subagentStart.js';
import { processUserPromptSubmit } from '../userPromptSubmit/userPromptSubmit.js';

/** Canonical plugin root used by status-rendering hooks. */
const pluginRoot = fileURLToPath(new URL('../../../', import.meta.url));

/** Temporary repositories created by cross-host comparisons. */
const createdRoots: string[] = [];

/**
 * Create a strict repository whose hook output is non-empty and deterministic.
 *
 * @returns Repository root with project configuration.
 */
function seedRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'seiri-hook-host-parity-'));
  createdRoots.push(root);
  mkdirSync(join(root, '.git'));
  writeConfig(root, 'project', { intervention: 'strict' });
  return root;
}

describe('non-Bash hook host payload parity', () => {
  let previousPluginRoot: string | undefined;

  beforeEach(() => {
    previousPluginRoot = process.env[ENV_PLUGIN_ROOT];
    process.env[ENV_PLUGIN_ROOT] = pluginRoot;
  });

  afterEach(() => {
    if (previousPluginRoot === undefined) delete process.env[ENV_PLUGIN_ROOT];
    else process.env[ENV_PLUGIN_ROOT] = previousPluginRoot;
    for (const root of createdRoots.splice(0))
      rmSync(root, { recursive: true, force: true });
  });

  it('keeps SessionStart output identical with Codex fields', () => {
    const cwd = seedRepo();
    const claude: SessionStartInput = {
      cwd,
      session_id: 'session-a',
      hook_event_name: 'SessionStart',
      source: 'startup',
    };
    const codex = {
      ...claude,
      turn_id: 'turn-a',
      model: 'gpt-5',
      permission_mode: 'default',
    };

    expect(processSessionStart(codex)).toEqual(processSessionStart(claude));
    expect(processSessionStart(codex).hookSpecificOutput?.hookEventName).toBe(
      'SessionStart',
    );
  });

  it('keeps UserPromptSubmit output identical with Codex fields', () => {
    const cwd = seedRepo();
    const claude: UserPromptSubmitInput = {
      cwd,
      session_id: 'session-a',
      hook_event_name: 'UserPromptSubmit',
      prompt: 'ignored',
    };
    const codex = {
      ...claude,
      turn_id: 'turn-a',
      model: 'gpt-5',
      permission_mode: 'default',
    };

    expect(processUserPromptSubmit(codex)).toEqual(
      processUserPromptSubmit(claude),
    );
    expect(
      processUserPromptSubmit(codex).hookSpecificOutput?.hookEventName,
    ).toBe('UserPromptSubmit');
  });

  it('keeps SubagentStart output identical with Codex fields', () => {
    const cwd = seedRepo();
    const claude: SubagentStartInput = {
      cwd,
      session_id: 'session-a',
      hook_event_name: 'SubagentStart',
      agent_id: 'agent-a',
      agent_type: 'worker',
    };
    const codex = {
      ...claude,
      turn_id: 'turn-a',
      model: 'gpt-5',
      permission_mode: 'default',
    };

    expect(processSubagentStart(codex)).toEqual(processSubagentStart(claude));
    expect(processSubagentStart(codex).hookSpecificOutput?.hookEventName).toBe(
      'SubagentStart',
    );
  });
});
