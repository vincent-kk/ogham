import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import { writeConfig } from '../../core/infra/configLoader/loaders/writeConfig.js';
import type { WorkflowHostAdapter } from '../../types/workflow.js';
import { processToolOutcome } from '../postToolUse/postToolUse.js';
import { processToolStart } from '../preToolUse/preToolUse.js';
import { renderCreatedAck } from '../shared/progressLine/renderCreatedAck.js';
import { renderSubagentLine } from '../shared/progressLine/renderSubagentLine.js';
import { CLAUDE_WORKFLOW_ADAPTER } from '../shared/workflowAdapters/claude.js';
import { CODEX_WORKFLOW_ADAPTER } from '../shared/workflowAdapters/codex.js';
import { workflowHash } from '../shared/workflowHost/workflowHash.js';
import { workflowIdentity } from '../shared/workflowHost/workflowIdentity.js';
import { processSubagentStart } from '../subagentStart/subagentStart.js';
import { processUserPromptSubmit } from '../userPromptSubmit/userPromptSubmit.js';

import { activateWorkflow, observeBash } from './helpers/workflowHarness.js';

/** Concrete host ABIs with matching native turn provenance. */
const HOSTS = [
  { adapter: CLAUDE_WORKFLOW_ADAPTER, native: { prompt_id: 'turn-a' } },
  { adapter: CODEX_WORKFLOW_ADAPTER, native: { turn_id: 'turn-a' } },
] as const;
/** Native entry envelope; each isolated repository supplies its own root. */
const ENTRY = {
  session_id: 'session-a',
  tool_use_id: 'entry',
  hook_event_name: 'PreToolUse' as const,
  tool_input: { action: 'step', step: 'write-plan', task: 'task-a' },
};
/** Repositories removed after their case finishes. */
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/**
 * Prepare a standard-dial repository without actor state.
 * @returns Isolated root, registered for cleanup.
 */
function seedRepo(): string {
  const cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-seeding-'));
  roots.push(cwd);
  mkdirSync(portableJoin(cwd, '.git'));
  writeConfig(cwd, 'project', { intervention: 'standard' });
  return cwd;
}

/**
 * Supply the selected host's native provenance to an entry request.
 * @param cwd Isolated repository root.
 * @param host Concrete adapter and native turn fields.
 * @returns Native PreToolUse payload for write-plan.
 */
function entry(
  cwd: string,
  host: { adapter: WorkflowHostAdapter; native: object },
) {
  return {
    ...ENTRY,
    cwd,
    ...host.native,
    tool_name: host.adapter.runtimeTool,
    tool_input: { ...ENTRY.tool_input, project_root: cwd },
  };
}

it.each(HOSTS)(
  'creates no sessions directory on a plain turn: $adapter.name',
  (host) => {
    const cwd = seedRepo();
    processUserPromptSubmit(
      { ...entry(cwd, host), hook_event_name: 'UserPromptSubmit' },
      host.adapter,
    );
    expect(existsSync(portableJoin(cwd, '.seiri/sessions'))).toBe(false);
  },
);

it.each(HOSTS)(
  'hands off the parent task without creating a child: $adapter.name',
  (host) => {
    const cwd = seedRepo();
    activateWorkflow(cwd, { ...host.native, task: 'task-a' });
    const child = {
      ...entry(cwd, host),
      agent_id: 'child-a',
    hook_event_name: 'SubagentStart' as const,
    };
    expect(
      processSubagentStart(child, host.adapter).hookSpecificOutput
        ?.additionalContext,
    ).toBe(renderSubagentLine('task-a', 'change'));
    const identity = workflowIdentity(child, host.adapter)!;
    expect(
      existsSync(
        portableJoin(cwd, '.seiri/sessions', `${identity.actor}.json`),
      ),
    ).toBe(false);
  },
);

it.each(HOSTS)(
  'seeds main and child native anchors on entry Pre and acknowledges Post: $adapter.name',
  (host) => {
    for (const agent_id of [undefined, 'child-a']) {
      const cwd = seedRepo();
      const input = { ...entry(cwd, host), ...(agent_id ? { agent_id } : {}) };
      const identity = workflowIdentity(input, host.adapter)!;
      const path = portableJoin(
        cwd,
        '.seiri/sessions',
        `${identity.actor}.json`,
      );
      expect(existsSync(path)).toBe(false);
      processToolStart(input, host.adapter);
      const state = JSON.parse(readFileSync(path, 'utf8'));
      expect(state.turn).toBe(
        workflowHash(agent_id ? JSON.stringify(['agent', agent_id]) : 'turn-a'),
      );
      expect(state.generation).toBe(1);
      const content = [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'accepted',
            action: 'step',
            step: 'write-plan',
            task: 'task-a',
            intent: 'change',
          }),
        },
      ];
      const result = processToolOutcome(
        {
          ...input,
          hook_event_name: 'PostToolUse',
          tool_response: host.adapter.name === 'claude' ? content : { content },
        },
        host.adapter,
      );
      expect(result.hookSpecificOutput?.additionalContext).toBe(
        renderCreatedAck('task-a', 'change', 'write-plan'),
      );
    }
  },
);

it.each(HOSTS)(
  'creates nothing for non-entry step and resume: $adapter.name',
  (host) => {
    const cwd = seedRepo();
    for (const request of [
      { action: 'step', step: 'verify' },
      { action: 'resume', intent: 'change' },
    ]) {
      const input = entry(cwd, host);
      processToolStart(
        {
          ...input,
          tool_input: { project_root: cwd, task: 'task-a', ...request },
        },
        host.adapter,
      );
      expect(existsSync(portableJoin(cwd, '.seiri/sessions'))).toBe(false);
    }
  },
);

it.each(HOSTS)('creates nothing for Bash Pre: $adapter.name', (host) => {
  const cwd = seedRepo();
  processToolStart(
    {
      ...entry(cwd, host),
      tool_name: 'Bash',
      tool_input: { command: 'echo OK' },
    },
    host.adapter,
  );
  expect(existsSync(portableJoin(cwd, '.seiri/sessions'))).toBe(false);
});

it.each(HOSTS)(
  'preserves a fresh existing mismatched anchor: $adapter.name',
  (host) => {
    const cwd = seedRepo();
    const input = entry(cwd, host);
    const identity = workflowIdentity(input, host.adapter)!;
    const dir = portableJoin(cwd, '.seiri/sessions');
    mkdirSync(dir);
    const path = portableJoin(dir, `${identity.actor}.json`);
    writeFileSync(
      path,
      JSON.stringify({
        version: 1,
        generation: 1,
        lastObservedAt: Date.now(),
        turn: 'other-turn',
        invocations: {},
        seen: [],
      }),
    );
    processToolStart(input, host.adapter);
    const state = JSON.parse(readFileSync(path, 'utf8'));
    expect(state.turn).toBe('other-turn');
    expect(state.generation).toBe(1);
    expect(state.invocations).toEqual({});
  },
);

it.each(HOSTS)(
  'advances a seeded actor on the next turn and records its Bash CHECK: $adapter.name',
  (host) => {
    const cwd = seedRepo();
    activateWorkflow(cwd, { ...host.native, task: 'task-a' });
    const identity = workflowIdentity(entry(cwd, host), host.adapter)!;
    const path = portableJoin(cwd, '.seiri/sessions', `${identity.actor}.json`);
    const before = JSON.parse(readFileSync(path, 'utf8'));
    const next =
      host.adapter.name === 'claude'
        ? { prompt_id: 'turn-b' }
        : { turn_id: 'turn-b' };
    processUserPromptSubmit(
      {
        cwd,
        session_id: 'session-a',
        ...next,
        hook_event_name: 'UserPromptSubmit',
      },
      host.adapter,
    );
    const after = JSON.parse(readFileSync(path, 'utf8'));
    expect(after.turn).toBe(workflowHash('turn-b'));
    expect(after.generation).toBe(before.generation + 1);
    const task = portableJoin(cwd, '.seiri/tasks/task-a');
    mkdirSync(task, { recursive: true });
    const ledger = portableJoin(task, 'gates.md');
    writeFileSync(
      ledger,
      '- [ ] G1: check\n  CHECK: `echo OK`\n  EXPECT: `OK`\n  EVIDENCE: pending\n',
    );
    observeBash({
      cwd,
      session_id: 'session-a',
      ...next,
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'echo OK' },
      tool_response: 'OK',
    });
    expect(readFileSync(ledger, 'utf8')).toContain('[x] G1');
  },
);

it.each(HOSTS)(
  'leaves corrupt state untouched at UPS and reseeds it at entry Pre: $adapter.name',
  (host) => {
    const cwd = seedRepo();
    const input = entry(cwd, host);
    const identity = workflowIdentity(input, host.adapter)!;
    const dir = portableJoin(cwd, '.seiri/sessions');
    mkdirSync(dir);
    const path = portableJoin(dir, `${identity.actor}.json`);
    writeFileSync(path, '{broken');
    processUserPromptSubmit(
      { ...input, hook_event_name: 'UserPromptSubmit' },
      host.adapter,
    );
    expect(readFileSync(path, 'utf8')).toBe('{broken');
    processToolStart(input, host.adapter);
    const state = JSON.parse(readFileSync(path, 'utf8'));
    expect(state.turn).toBe(workflowHash('turn-a'));
    expect(state.generation).toBe(1);
    expect(Object.keys(state.invocations)).toEqual([identity.call]);
  },
);

it.each(HOSTS)(
  'removes orphan quarantine markers before entry seed: $adapter.name',
  (host) => {
    for (const suffix of ['.revoked', '.revoked-suspend']) {
      const cwd = seedRepo();
      const input = entry(cwd, host);
      const identity = workflowIdentity(input, host.adapter)!;
      const dir = portableJoin(cwd, '.seiri/sessions');
      mkdirSync(dir);
      const path = portableJoin(dir, `${identity.actor}.json`);
      writeFileSync(`${path}${suffix}`, 'orphan');
      processToolStart(input, host.adapter);
      expect(existsSync(`${path}${suffix}`)).toBe(false);
      const state = JSON.parse(readFileSync(path, 'utf8'));
      expect(state.generation).toBe(1);
      expect(state.turn).toBe(workflowHash('turn-a'));
    }
  },
);
