import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import { processToolOutcome } from '../postToolUse/postToolUse.js';
import { processToolStart } from '../preToolUse/preToolUse.js';
import { processSessionStart } from '../setup/setup.js';
import { CLAUDE_WORKFLOW_ADAPTER } from '../shared/workflowAdapters/claude.js';
import { CODEX_WORKFLOW_ADAPTER } from '../shared/workflowAdapters/codex.js';
import { processUserPromptSubmit } from '../userPromptSubmit/userPromptSubmit.js';

import { activateWorkflow } from './helpers/workflowHarness.js';

const HOSTS = [CLAUDE_WORKFLOW_ADAPTER, CODEX_WORKFLOW_ADAPTER];
const roots: string[] = [];
function fixture(host: string) {
  const cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-turn-'));
  roots.push(cwd);
  mkdirSync(portableJoin(cwd, '.git'));
  mkdirSync(portableJoin(cwd, '.seiri'));
  writeFileSync(
    portableJoin(cwd, '.seiri/config.json'),
    '{"intervention":"standard"}',
  );
  const native =
    host === 'claude' ? { prompt_id: 'turn-a' } : { turn_id: 'turn-a' };
  expect(activateWorkflow(cwd, native).hookSpecificOutput).toBeDefined();
  return {
    cwd,
    session_id: 'session-a',
    ...native,
    tool_use_id: 'resume',
    tool_name:
      host === 'claude'
        ? 'mcp__plugin_seiri_tools__runtime'
        : 'mcp__seiri__runtime',
    tool_input: {
      action: 'resume',
      project_root: cwd,
      task: 'payment-refactor',
      intent: 'change',
    },
  };
}
function result(host: string) {
  const content = [
    {
      type: 'text',
      text: JSON.stringify({
        status: 'accepted',
        action: 'resume',
        task: 'payment-refactor',
        intent: 'change',
      }),
    },
  ];
  return host === 'claude' ? content : { content };
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it.each(HOSTS)(
  '$name rejects a late pre/post lifecycle pair after a new user turn',
  (adapter) => {
    const host = adapter.name;
    const input = fixture(host);
    processUserPromptSubmit(
      {
        ...input,
        ...(host === 'claude'
          ? { prompt_id: 'turn-b' }
          : { turn_id: 'turn-b' }),
        hook_event_name: 'UserPromptSubmit',
      },
      adapter,
    );
    processToolStart({ ...input, hook_event_name: 'PreToolUse' }, adapter);
    expect(
      processToolOutcome(
        {
          ...input,
          hook_event_name: 'PostToolUse',
          tool_response: result(host),
        },
        adapter,
      ).hookSpecificOutput,
    ).toBeUndefined();
  },
);
it.each(HOSTS)(
  '$name requires successful request-matching MCP content',
  (adapter) => {
    const host = adapter.name;
    const input = fixture(host);
    processToolStart({ ...input, hook_event_name: 'PreToolUse' }, adapter);
    expect(
      processToolOutcome(
        {
          ...input,
          hook_event_name: 'PostToolUse',
          tool_response: { isError: true, content: result(host) },
        },
        adapter,
      ).hookSpecificOutput,
    ).toBeUndefined();
    const mismatched = { ...input, tool_use_id: 'resume-mismatch' };
    processToolStart(
      { ...mismatched, hook_event_name: 'PreToolUse' },
      adapter,
    );
    const mismatchedContent = [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'rejected',
          action: 'start',
          task: 'unrelated-task',
          intent: 'change',
        }),
      },
    ];
    expect(
      processToolOutcome(
        {
          ...mismatched,
          hook_event_name: 'PostToolUse',
          tool_response:
            host === 'claude'
              ? mismatchedContent
              : { content: mismatchedContent },
        },
        adapter,
      ).hookSpecificOutput,
    ).toBeUndefined();
    const matched = { ...input, tool_use_id: 'resume-match' };
    processToolStart({ ...matched, hook_event_name: 'PreToolUse' }, adapter);
    expect(
      processToolOutcome(
        {
          ...matched,
          hook_event_name: 'PostToolUse',
          tool_response: result(host),
        },
        adapter,
      ).hookSpecificOutput,
    ).toBeDefined();
  },
);
it.each(HOSTS)(
  '$name preserves compaction but invalidates a session resume',
  (adapter) => {
    const host = adapter.name;
    const input = fixture(host);
    processToolStart({ ...input, hook_event_name: 'PreToolUse' }, adapter);
    processSessionStart(
      {
        ...input,
        hook_event_name: 'SessionStart',
        source: 'compact',
      },
      adapter,
    );
    expect(
      processToolOutcome(
        {
          ...input,
          hook_event_name: 'PostToolUse',
          tool_response: result(host),
        },
        adapter,
      ).hookSpecificOutput,
    ).toBeDefined();
    const next = { ...input, tool_use_id: 'next' };
    processToolStart({ ...next, hook_event_name: 'PreToolUse' }, adapter);
    processSessionStart(
      {
        cwd: input.cwd,
        session_id: input.session_id,
        hook_event_name: 'SessionStart',
        source: 'resume',
      },
      adapter,
    );
    expect(
      processToolOutcome(
        {
          ...next,
          hook_event_name: 'PostToolUse',
          tool_response: result(host),
        },
        adapter,
      ).hookSpecificOutput,
    ).toBeUndefined();
  },
);
it('does not treat reading a Skill as an activation request', () => {
  const input = fixture('claude');
  processUserPromptSubmit({
    ...input,
    prompt_id: 'turn-b',
    hook_event_name: 'UserPromptSubmit',
  });
  expect(
    processToolOutcome({
      ...input,
      prompt_id: 'turn-b',
      hook_event_name: 'PostToolUse',
      tool_name: 'Skill',
      tool_input: { skill: 'seiri:execute' },
    }).hookSpecificOutput,
  ).toBeUndefined();
});
