import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import type { HookOutput } from '../../types/hooks.js';
import { observationLogPath } from '../instructionsLoaded/utils/appendObservation.js';

const pluginRoot = fileURLToPath(new URL('../../../', import.meta.url));
const createdRoots: string[] = [];

describe('hook entry silence', () => {
  afterEach(() => {
    for (const root of createdRoots.splice(0))
      rmSync(root, { recursive: true, force: true });
  });

  it.each([
    {
      name: 'SessionStart with explicit off',
      configuration: 'off',
      bundle: 'setup.mjs',
      payload: { hook_event_name: 'SessionStart', source: 'startup' },
    },
    {
      name: 'SessionStart with the built-in default',
      configuration: 'default',
      bundle: 'setup.mjs',
      payload: { hook_event_name: 'SessionStart', source: 'startup' },
    },
    {
      name: 'UserPromptSubmit with explicit off',
      configuration: 'off',
      bundle: 'user-prompt-submit.mjs',
      payload: { hook_event_name: 'UserPromptSubmit', prompt: 'ignored' },
    },
    {
      name: 'UserPromptSubmit with the built-in default',
      configuration: 'default',
      bundle: 'user-prompt-submit.mjs',
      payload: { hook_event_name: 'UserPromptSubmit', prompt: 'ignored' },
    },
    {
      name: 'PostToolUse with explicit off',
      configuration: 'off',
      bundle: 'post-tool-use.mjs',
      payload: {
        hook_event_name: 'PostToolUse',
        tool_name: 'Skill',
        tool_input: { skill: 'seiri:write-plan' },
        tool_response: {},
      },
    },
    {
      name: 'PostToolUse with the built-in default',
      configuration: 'default',
      bundle: 'post-tool-use.mjs',
      payload: {
        hook_event_name: 'PostToolUse',
        tool_name: 'Skill',
        tool_input: { skill: 'seiri:write-plan' },
        tool_response: {},
      },
    },
    {
      name: 'SubagentStart with explicit off',
      configuration: 'off',
      bundle: 'subagent-start.mjs',
      payload: {
        hook_event_name: 'SubagentStart',
        agent_id: 'agent-a',
        agent_type: 'worker',
      },
    },
    {
      name: 'SubagentStart with the built-in default',
      configuration: 'default',
      bundle: 'subagent-start.mjs',
      payload: {
        hook_event_name: 'SubagentStart',
        agent_id: 'agent-a',
        agent_type: 'worker',
      },
    },
    {
      name: 'InstructionsLoaded with explicit off',
      configuration: 'off',
      bundle: 'instructions-loaded.mjs',
      payload: {
        hook_event_name: 'InstructionsLoaded',
        source: 'project',
      },
    },
    {
      name: 'InstructionsLoaded with the built-in default',
      configuration: 'default',
      bundle: 'instructions-loaded.mjs',
      payload: {
        hook_event_name: 'InstructionsLoaded',
        source: 'project',
      },
    },
  ] as const)('$name exits without a wire response', (testCase) => {
    const repoRoot = mkdtempSync(portableJoin(tmpdir(), 'seiri-hook-silence-'));
    createdRoots.push(repoRoot);
    mkdirSync(portableJoin(repoRoot, '.git'));
    if (testCase.configuration === 'off') {
      mkdirSync(portableJoin(repoRoot, '.seiri'));
      writeFileSync(
        portableJoin(repoRoot, '.seiri', 'config.json'),
        `${JSON.stringify({ intervention: 'off' })}\n`,
        'utf8',
      );
    }

    const result = spawnSync(
      process.execPath,
      [
        portableJoin(pluginRoot, 'libs', 'run.cjs'),
        portableJoin(pluginRoot, 'bridge', testCase.bundle),
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot },
        input: JSON.stringify({
          cwd: repoRoot,
          session_id: 'session-a',
          ...testCase.payload,
        }),
        windowsHide: true,
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
    expect(
      existsSync(portableJoin(repoRoot, '.seiri', 'session-signals.json')),
    ).toBe(false);
    if (testCase.bundle === 'instructions-loaded.mjs')
      expect(existsSync(observationLogPath())).toBe(false);
  });

  it('preserves meaningful context through the manifest runner', () => {
    const repoRoot = mkdtempSync(portableJoin(tmpdir(), 'seiri-hook-context-'));
    createdRoots.push(repoRoot);
    mkdirSync(portableJoin(repoRoot, '.git'));
    mkdirSync(portableJoin(repoRoot, '.seiri'));
    writeFileSync(
      portableJoin(repoRoot, '.seiri', 'config.json'),
      `${JSON.stringify({ intervention: 'standard' })}\n`,
      'utf8',
    );

    const result = spawnSync(
      process.execPath,
      [
        portableJoin(pluginRoot, 'libs', 'run.cjs'),
        portableJoin(pluginRoot, 'bridge', 'setup.mjs'),
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot },
        input: JSON.stringify({
          cwd: repoRoot,
          session_id: 'session-a',
          hook_event_name: 'SessionStart',
          source: 'startup',
        }),
        windowsHide: true,
      },
    );
    const output = JSON.parse(result.stdout) as HookOutput;

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(output.hookSpecificOutput?.additionalContext).toContain('Election');
  });
});
