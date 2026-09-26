import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { ELECTION_STRICT_LINE } from '../../constants/electionLines.js';
import { STRICT_POSTURE_LINE } from '../../constants/postureLines.js';
import { WORKFLOW_CHAIN_LINE } from '../../constants/workflowChain.js';
import { writeConfig } from '../../core/infra/configLoader/loaders/writeConfig.js';
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
