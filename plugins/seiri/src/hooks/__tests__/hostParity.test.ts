import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { ELECTION_STRICT_LINE } from '../../constants/electionLines.js';
import { STRICT_POSTURE_LINE } from '../../constants/postureLines.js';
import { WORKFLOW_CHAIN_LINE } from '../../constants/workflowChain.js';
import { writeConfig } from '../../core/infra/configLoader/loaders/writeConfig.js';
import { processToolStart } from '../preToolUse/preToolUse.js';
import { expandEditInputs } from '../preToolUse/utils/expandEditInputs.js';
import { processSessionStart } from '../setup/setup.js';
import { renderProgressLine } from '../shared/progressLine/renderProgressLine.js';
import { renderSubagentLine } from '../shared/progressLine/renderSubagentLine.js';
import { CLAUDE_WORKFLOW_ADAPTER } from '../shared/workflowAdapters/claude.js';
import { CODEX_WORKFLOW_ADAPTER } from '../shared/workflowAdapters/codex.js';
import { processSubagentStart } from '../subagentStart/subagentStart.js';
import { processUserPromptSubmit } from '../userPromptSubmit/userPromptSubmit.js';

import { activateWorkflow, observeBash } from './helpers/workflowHarness.js';

/** Tests select concrete adapters; production bundles fix one adapter at build time. */
const HOSTS = [
  {
    adapter: CLAUDE_WORKFLOW_ADAPTER,
    native: { prompt_id: 'turn-a' },
    next: { prompt_id: 'turn-b' },
    child: { prompt_id: 'turn-a' },
    failure: { hook_event_name: 'PostToolUseFailure', error: 'Exit code 1' },
  },
  {
    adapter: CODEX_WORKFLOW_ADAPTER,
    native: { turn_id: 'turn-a' },
    next: { turn_id: 'turn-b' },
    child: { turn_id: 'turn-child' },
    failure: { hook_event_name: 'PostToolUse', tool_response: 'Exit code 1' },
  },
] as const;

/** Temporary repositories isolate each host's actor state. */
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/** Make a project that permits explicit participation for either host. */
function seedRepo(): string {
  const cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-hook-host-parity-'));
  roots.push(cwd);
  mkdirSync(portableJoin(cwd, '.git'));
  writeConfig(cwd, 'project', { intervention: 'strict' });
  return cwd;
}

/**
 * Edit files the way each host does: one Claude `Edit` per file, or one
 * Codex `apply_patch` updating every file, expanded as the entry does.
 * @param cwd Repository working directory.
 * @param host Concrete adapter with its native turn fields.
 * @param files Absolute target paths in edit order.
 * @param extra Payload fields such as `agent_id`.
 * @returns The injected notices in order.
 */
function editNotices(
  cwd: string,
  host: (typeof HOSTS)[number],
  files: string[],
  extra: { agent_id?: string } = {},
): string[] {
  const base = {
    cwd,
    session_id: 'session-a',
    ...host.native,
    ...extra,
    hook_event_name: 'PreToolUse' as const,
  };
  const inputs =
    host.adapter.name === 'claude'
      ? files.map((file) => ({
          ...base,
          tool_use_id: randomUUID(),
          tool_name: 'Edit',
          tool_input: { file_path: file },
        }))
      : expandEditInputs({
          ...base,
          tool_use_id: randomUUID(),
          tool_name: 'apply_patch',
          tool_input: {
            command: `*** Begin Patch\n${files.map((file) => `*** Update File: ${file}\n@@\n-a\n+b`).join('\n')}\n*** End Patch`,
          },
        });
  return inputs.flatMap(
    (input) =>
      processToolStart(input, host.adapter).hookSpecificOutput
        ?.additionalContext ?? [],
  );
}

describe('edit notice host parity', () => {
  it('gives the same first-edit, active-task and child results on either host', () => {
    const results = HOSTS.map((host) => {
      const unbound = seedRepo();
      const file = portableJoin(unbound, 'src', 'a.ts');
      const bound = seedRepo();
      activateWorkflow(bound, host.native);
      const child = seedRepo();
      return [
        editNotices(unbound, host, [file]),
        editNotices(unbound, host, [file]),
        editNotices(bound, host, [portableJoin(bound, 'src', 'a.ts')]),
        editNotices(child, host, [portableJoin(child, 'src', 'a.ts')], {
          agent_id: 'agent-a',
        }),
      ];
    });
    expect(results[0]).toEqual(results[1]);
    expect(results[0]?.[0]?.[0]).toContain('First edit this turn');
    expect(results[0]?.slice(1)).toEqual([[], [], []]);
  });

  it('observes both notices for three files: one Codex patch or three Claude edits', () => {
    const results = HOSTS.map((host) => {
      const cwd = seedRepo();
      return editNotices(
        cwd,
        host,
        ['a', 'b', 'c'].map((name) => portableJoin(cwd, 'src', `${name}.ts`)),
      );
    });
    expect(results[0]).toEqual(results[1]);
    expect(results[0]).toHaveLength(2);
    expect(results[0]?.[0]).toContain('First edit this turn');
    expect(results[0]?.[1]).toContain('3 files edited this turn');
  });
});

describe('non-Bash hook host payload parity', () => {
  it.each(['startup', 'resume', 'clear', 'fork'])(
    'suspends participation on %s in either host and injects only the session contract',
    (source) => {
      for (const { adapter, native, failure } of HOSTS) {
        const cwd = seedRepo();
        expect(activateWorkflow(cwd, native).hookSpecificOutput).toBeDefined();
        const result = processSessionStart(
          {
            cwd,
            session_id: 'session-a',
            ...native,
            hook_event_name: 'SessionStart',
            source,
          },
          adapter,
        );
        expect(result).toEqual({
          continue: true,
          hookSpecificOutput: {
            hookEventName: 'SessionStart',
            additionalContext: expect.stringContaining(
              `[seiri] ${ELECTION_STRICT_LINE}\n[seiri] ${WORKFLOW_CHAIN_LINE}\n[seiri] ${STRICT_POSTURE_LINE}`,
            ),
          },
        });
        expect(result.hookSpecificOutput?.additionalContext).not.toContain(
          'payment-refactor',
        );
        for (let i = 0; i < 3; i++)
          expect(
            observeBash({
              cwd,
              session_id: 'session-a',
              ...native,
              ...failure,
              tool_name: 'Bash',
              tool_input: { command: 'fail' },
            }),
          ).toEqual({ continue: true });
      }
    },
  );

  it('replaces native user-turn provenance on either host, naming only the active task', () => {
    for (const { adapter, native, next, failure } of HOSTS) {
      const cwd = seedRepo();
      expect(activateWorkflow(cwd, native).hookSpecificOutput).toBeDefined();
      expect(
        processUserPromptSubmit(
          {
            cwd,
            session_id: 'session-a',
            ...next,
            hook_event_name: 'UserPromptSubmit',
            prompt: 'ignored',
          },
          adapter,
        ),
      ).toEqual({
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: renderProgressLine('payment-refactor', 'change'),
        },
      });
      for (let i = 0; i < 3; i++)
        expect(
          observeBash({
            cwd,
            session_id: 'session-a',
            ...native,
            ...failure,
            tool_name: 'Bash',
            tool_input: { command: 'fail' },
          }),
        ).toEqual({ continue: true });
    }
  });

  it('keeps a child independent of its parent on either host', () => {
    for (const { adapter, native, child, failure } of HOSTS) {
      const cwd = seedRepo();
      expect(activateWorkflow(cwd, native).hookSpecificOutput).toBeDefined();
      expect(
        processSubagentStart(
          {
            cwd,
            session_id: 'session-a',
            ...child,
            agent_id: 'child-a',
            hook_event_name: 'SubagentStart',
          },
          adapter,
        ),
      ).toEqual({
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'SubagentStart',
          additionalContext: renderSubagentLine('payment-refactor', 'change'),
        },
      });
      for (let i = 0; i < 3; i++)
        expect(
          observeBash({
            cwd,
            session_id: 'session-a',
            ...child,
            ...failure,
            agent_id: 'child-a',
            tool_name: 'Bash',
            tool_input: { command: 'fail' },
          }),
        ).toEqual({ continue: true });
    }
  });
});
