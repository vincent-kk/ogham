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
    {
      name: 'PreToolUse with explicit off',
      configuration: 'off',
      bundle: 'pre-tool-use.mjs',
      payload: {
        hook_event_name: 'PreToolUse',
        tool_use_id: 'bash-a',
        tool_name: 'Bash',
        tool_input: { command: 'echo OK' },
      },
    },
    {
      name: 'PreToolUse with the built-in default',
      configuration: 'default',
      bundle: 'pre-tool-use.mjs',
      payload: {
        hook_event_name: 'PreToolUse',
        tool_use_id: 'bash-a',
        tool_name: 'Bash',
        tool_input: { command: 'echo OK' },
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
        portableJoin(pluginRoot, 'bridge', 'claude', testCase.bundle),
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot },
        input: JSON.stringify({
          cwd: repoRoot,
          session_id: 'session-a',
          prompt_id: 'turn-a',
          ...testCase.payload,
        }),
        windowsHide: true,
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
    expect(existsSync(portableJoin(repoRoot, '.seiri', 'sessions'))).toBe(
      false,
    );
    if (testCase.bundle === 'instructions-loaded.mjs')
      expect(existsSync(observationLogPath())).toBe(false);
  });

  it.each([
    {
      name: 'Claude',
      directory: ['claude'],
      native: { prompt_id: 'turn-a' },
      tool: 'mcp__plugin_seiri_tools__workflow',
    },
    {
      name: 'Codex',
      directory: ['codex'],
      native: { turn_id: 'turn-a' },
      tool: 'mcp__seiri__workflow',
    },
  ] as const)(
    'preserves an explicit workflow acknowledgment through the $name manifest runner',
    (host) => {
      const repoRoot = mkdtempSync(
        portableJoin(tmpdir(), 'seiri-hook-context-'),
      );
      createdRoots.push(repoRoot);
      mkdirSync(portableJoin(repoRoot, '.git'));
      mkdirSync(portableJoin(repoRoot, '.seiri'));
      writeFileSync(
        portableJoin(repoRoot, '.seiri', 'config.json'),
        '{"intervention":"standard"}',
      );

      const native = {
        cwd: repoRoot,
        session_id: 'session-a',
        ...host.native,
      };
      const run = (bundle: string, payload: Record<string, unknown>) =>
        spawnSync(
          process.execPath,
          [
            portableJoin(pluginRoot, 'libs', 'run.cjs'),
            portableJoin(pluginRoot, 'bridge', ...host.directory, bundle),
          ],
          {
            cwd: repoRoot,
            encoding: 'utf8',
            env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot },
            input: JSON.stringify({ ...native, ...payload }),
            windowsHide: true,
          },
        );
      const boundary = run('user-prompt-submit.mjs', {
        hook_event_name: 'UserPromptSubmit',
      });
      expect({
        status: boundary.status,
        stdout: boundary.stdout,
        stderr: boundary.stderr,
      }).toEqual({ status: 0, stdout: '', stderr: '' });
      const request = {
        action: 'start',
        project_root: repoRoot,
        task: 'runner-proof',
        intent: 'change',
      };
      const invocation = {
        tool_use_id: 'workflow-start',
        tool_name: host.tool,
        tool_input: request,
      };
      const pre = run('pre-tool-use.mjs', {
        ...invocation,
        hook_event_name: 'PreToolUse',
      });
      expect({
        status: pre.status,
        stdout: pre.stdout,
        stderr: pre.stderr,
      }).toEqual({ status: 0, stdout: '', stderr: '' });
      const content = [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'accepted',
            action: 'start',
            task: 'runner-proof',
            intent: 'change',
          }),
        },
      ];
      const result = run('post-tool-use.mjs', {
        ...invocation,
        hook_event_name: 'PostToolUse',
        tool_response: host.name === 'Claude' ? content : { content },
      });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      const output = JSON.parse(result.stdout) as HookOutput;
      expect(output.hookSpecificOutput?.additionalContext).toContain(
        'runner-proof',
      );
      expect(output.hookSpecificOutput?.additionalContext).not.toContain(
        'Election',
      );
    },
  );
});
