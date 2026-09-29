import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { EDIT_TRACKED_FILES_CAP } from '../../../constants/editNotice.js';
import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import type { PreToolUseInput } from '../../../types/hooks.js';
import type { WorkflowState } from '../../../types/workflow.js';
import { activateWorkflow } from '../../__tests__/helpers/workflowHarness.js';
import { processSessionStart } from '../../setup/setup.js';
import { CLAUDE_WORKFLOW_ADAPTER } from '../../shared/workflowAdapters/claude.js';
import { CODEX_WORKFLOW_ADAPTER } from '../../shared/workflowAdapters/codex.js';
import { workflowIdentity } from '../../shared/workflowHost/workflowIdentity.js';
import { processUserPromptSubmit } from '../../userPromptSubmit/userPromptSubmit.js';
import { processToolStart } from '../preToolUse.js';
import { expandEditInputs } from '../utils/expandEditInputs.js';

/** Claude edits through `Edit`; Codex through an expanded `apply_patch`. */
const HOSTS = [
  {
    adapter: CLAUDE_WORKFLOW_ADAPTER,
    native: { prompt_id: 'turn-a' },
    next: { prompt_id: 'turn-b' },
  },
  {
    adapter: CODEX_WORKFLOW_ADAPTER,
    native: { turn_id: 'turn-a' },
    next: { turn_id: 'turn-b' },
  },
] as const;
type Host = (typeof HOSTS)[number];

const FIRST = 'First edit this turn';
/** Directories removed after their case finishes. */
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/**
 * Make an isolated directory registered for cleanup.
 * @returns Its path as `tmpdir()` spells it, which may pass through a symlink.
 */
function tempDir(): string {
  const dir = mkdtempSync(portableJoin(tmpdir(), 'seiri-edit-notice-'));
  roots.push(dir);
  return dir;
}

/**
 * Prepare a repository at the given dial without actor state.
 * @param intervention Dial written to the project config layer.
 * @param cwd Directory to turn into the repository; a fresh one by default.
 * @returns The repository root.
 */
function seedRepo(
  intervention: 'off' | 'advisory' | 'standard' | 'strict',
  cwd: string = tempDir(),
): string {
  mkdirSync(portableJoin(cwd, '.git'));
  writeConfig(cwd, 'project', { intervention });
  return cwd;
}

/**
 * Edit one file the way each host does and collect the injected context.
 * @param cwd Payload working directory.
 * @param host Concrete adapter with its native turn fields.
 * @param file Target path as the host would send it.
 * @param extra Payload fields such as `agent_id` or a later native turn.
 * @returns Every notice the call produced, joined, or `''` for none.
 */
function edit(
  cwd: string,
  host: Host,
  file: string,
  extra: Partial<PreToolUseInput> = {},
): string {
  const base = {
    cwd,
    session_id: 'session-a',
    ...host.native,
    ...extra,
    hook_event_name: 'PreToolUse' as const,
    tool_use_id: randomUUID(),
  };
  const inputs =
    host.adapter.name === 'claude'
      ? [{ ...base, tool_name: 'Edit', tool_input: { file_path: file } }]
      : expandEditInputs({
          ...base,
          tool_name: 'apply_patch',
          tool_input: {
            command: `*** Begin Patch\n*** Update File: ${file}\n@@\n-a\n+b\n*** End Patch`,
          },
        });
  return inputs
    .map(
      (input) =>
        processToolStart(input, host.adapter).hookSpecificOutput
          ?.additionalContext ?? '',
    )
    .join('');
}

/**
 * Read the main actor's persisted state for the host's session.
 * @param cwd Repository working directory.
 * @param host Concrete adapter with its native turn fields.
 * @returns The actor state, or `undefined` when no file exists.
 */
function actorState(cwd: string, host: Host): WorkflowState | undefined {
  const identity = workflowIdentity(
    {
      cwd,
      session_id: 'session-a',
      ...host.native,
      hook_event_name: 'PreToolUse',
    },
    host.adapter,
  );
  const path = portableJoin(
    identity!.root,
    '.seiri',
    'sessions',
    `${identity!.actor}.json`,
  );
  return existsSync(path)
    ? (JSON.parse(readFileSync(path, 'utf8')) as WorkflowState)
    : undefined;
}

describe.each(HOSTS)('edit notice: $adapter.name', (host) => {
  it('announces the first unbound edit once, not again for the same file', () => {
    const cwd = seedRepo('standard');
    expect(edit(cwd, host, portableJoin(cwd, 'src', 'a.ts'))).toContain(FIRST);
    expect(edit(cwd, host, portableJoin(cwd, 'src', 'a.ts'))).toBe('');
  });

  it('announces the second distinct file once and records no file past the cap', () => {
    const cwd = seedRepo('standard');
    const file = (n: number) => portableJoin(cwd, 'src', `f${n}.ts`);
    expect(edit(cwd, host, file(1))).toContain(FIRST);
    expect(edit(cwd, host, file(2))).toContain(
      '2 files edited this turn with no active task',
    );
    expect(edit(cwd, host, file(3))).toBe('');
    for (let n = 4; n <= EDIT_TRACKED_FILES_CAP + 2; n++)
      expect(edit(cwd, host, file(n))).toBe('');
    expect(actorState(cwd, host)?.edits?.files).toHaveLength(
      EDIT_TRACKED_FILES_CAP,
    );
  });

  it('stays silent and records nothing inside an active task', () => {
    const cwd = seedRepo('standard');
    expect(activateWorkflow(cwd, host.native).hookSpecificOutput).toBeDefined();
    expect(edit(cwd, host, portableJoin(cwd, 'src', 'a.ts'))).toBe('');
    expect(actorState(cwd, host)?.edits).toBeUndefined();
  });

  it('still announces while a binding is paused', () => {
    const cwd = seedRepo('standard');
    activateWorkflow(cwd, host.native);
    processSessionStart(
      {
        cwd,
        session_id: 'session-a',
        ...host.native,
        hook_event_name: 'SessionStart',
        source: 'startup',
      },
      host.adapter,
    );
    processUserPromptSubmit(
      {
        cwd,
        session_id: 'session-a',
        ...host.next,
        hook_event_name: 'UserPromptSubmit',
      },
      host.adapter,
    );
    expect(actorState(cwd, host)?.binding?.state).toBe('suspended');
    expect(
      edit(cwd, host, portableJoin(cwd, 'src', 'a.ts'), host.next),
    ).toContain(FIRST);
  });

  it('ignores .seiri paths and paths outside the repository', () => {
    const cwd = seedRepo('standard');
    const outside = tempDir();
    expect(
      edit(cwd, host, portableJoin(cwd, '.seiri', 'tasks', 'x', 'plan.md')),
    ).toBe('');
    expect(edit(cwd, host, portableJoin(outside, 'a.ts'))).toBe('');
    expect(edit(cwd, host, portableJoin(cwd, 'src', 'a.ts'))).toContain(FIRST);
  });

  it('resolves a symlinked cwd to the same repository-relative file', () => {
    const real = seedRepo('standard');
    const link = portableJoin(tempDir(), 'link');
    symlinkSync(real, link);
    expect(edit(link, host, portableJoin(link, 'src', 'a.ts'))).toContain(
      FIRST,
    );
    expect(edit(link, host, portableJoin(real, 'src', 'a.ts'))).toBe('');
  });

  it('counts a cwd-relative path to a file that does not exist yet', () => {
    const cwd = seedRepo('standard');
    expect(edit(cwd, host, 'src/new/deep.ts')).toContain(FIRST);
    expect(edit(cwd, host, portableJoin(cwd, 'src', 'new', 'deep.ts'))).toBe(
      '',
    );
  });

  it.each(['off', 'advisory'] as const)(
    'stays silent and creates no sessions directory at %s',
    (intervention) => {
      const cwd = seedRepo(intervention);
      expect(edit(cwd, host, portableJoin(cwd, 'src', 'a.ts'))).toBe('');
      expect(existsSync(portableJoin(cwd, '.seiri', 'sessions'))).toBe(false);
    },
  );

  it('neither injects nor creates state for a child actor', () => {
    const cwd = seedRepo('standard');
    expect(
      edit(cwd, host, portableJoin(cwd, 'src', 'a.ts'), {
        agent_id: 'agent-a',
      }),
    ).toBe('');
    expect(existsSync(portableJoin(cwd, '.seiri', 'sessions'))).toBe(false);
  });

  it('announces again after a new user turn', () => {
    const cwd = seedRepo('standard');
    const file = portableJoin(cwd, 'src', 'a.ts');
    expect(edit(cwd, host, file)).toContain(FIRST);
    processUserPromptSubmit(
      {
        cwd,
        session_id: 'session-a',
        ...host.next,
        hook_event_name: 'UserPromptSubmit',
      },
      host.adapter,
    );
    expect(edit(cwd, host, file, host.next)).toContain(FIRST);
  });
});

describe('expandEditInputs', () => {
  const base = {
    cwd: '/repo',
    session_id: 'session-a',
    turn_id: 'turn-a',
    hook_event_name: 'PreToolUse' as const,
  };
  const patch = (body: string) => ({
    ...base,
    tool_name: 'apply_patch',
    tool_input: { command: `*** Begin Patch\n${body}\n*** End Patch` },
  });

  it('passes a Claude Edit and a Codex Bash through untouched', () => {
    const claudeEdit = {
      ...base,
      tool_name: 'Edit',
      tool_input: { file_path: '/repo/a.ts' },
    };
    const bash = {
      ...base,
      tool_name: 'Bash',
      tool_input: { command: 'cat a.md' },
    };
    expect(expandEditInputs(claudeEdit)).toEqual([claudeEdit]);
    expect(expandEditInputs(bash)).toEqual([bash]);
  });

  it('expands an add and an update into Write and Edit with their paths', () => {
    const expanded = expandEditInputs(
      patch(
        '*** Add File: src/new.ts\n+x\n*** Update File: src/old.ts\n@@\n-a\n+b',
      ),
    );
    expect(
      expanded.map((use) => [use.tool_name, use.tool_input?.file_path]),
    ).toEqual([
      ['Write', 'src/new.ts'],
      ['Edit', 'src/old.ts'],
    ]);
  });

  it('keeps an unparsable patch as the single original payload', () => {
    const broken = patch('*** Frobnicate File: a.ts');
    expect(expandEditInputs(broken)).toEqual([broken]);
  });

  it('counts only the destination of a Move and drops deletes', () => {
    const expanded = expandEditInputs(
      patch(
        '*** Update File: a.ts\n*** Move to: b.ts\n@@\n-x\n+y\n*** Delete File: c.ts',
      ),
    );
    expect(
      expanded.map((use) => [use.tool_name, use.tool_input?.file_path]),
    ).toEqual([['Write', 'b.ts']]);
  });
});
