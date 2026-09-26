import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { portableDirname, portableJoin, spawnCli } from '@ogham/cross-platform';
import { afterAll, describe, expect, it } from 'vitest';

/** Manifest hook bundles are the artifact executed by separate host processes. */
const packageRoot = portableJoin(
  portableDirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
);
/** A bounded stress run exercises both Pre and Post read-modify-write races. */
const ROUNDS = 12;
/** Projects created by this bundle-level suite. */
const roots: string[] = [];

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** Create the project configuration consumed by the actual hook bundles. */
function makeProjectRoot(): string {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-concurrent-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  mkdirSync(portableJoin(root, '.seiri'));
  writeFileSync(
    portableJoin(root, '.seiri', 'config.json'),
    '{"intervention":"strict"}',
  );
  return root;
}

/** Execute one packaged hook with native-shaped JSON and check process success. */
async function hook(
  bundle: string,
  input: Record<string, unknown>,
): Promise<string> {
  const path = portableJoin(packageRoot, 'bridge', 'claude', bundle);
  if (!existsSync(path))
    throw new Error(`Missing ${path}; run yarn seiri build:hooks`);
  const result = await spawnCli('node', [path], {
    input: JSON.stringify(input),
    timeoutMs: 5_000,
  });
  expect({
    code: result.code,
    timedOut: result.timedOut,
    stderr: result.stderr,
  }).toEqual({ code: 0, timedOut: false, stderr: '' });
  return result.stdout;
}

/** Read the only actor in this isolated repository, without copying its hash algorithm. */
function state(root: string) {
  const dir = portableJoin(root, '.seiri', 'sessions');
  const names = readdirSync(dir).filter((name) => name.endsWith('.json'));
  expect(names).toHaveLength(1);
  return JSON.parse(readFileSync(portableJoin(dir, names[0]!), 'utf8')) as {
    binding: { task: string; counts: Record<string, number> };
    invocations: Record<string, unknown>;
  };
}

describe('concurrent paired hook processes', () => {
  it('preserves both in-flight calls and both failure counters', async () => {
    const cwd = makeProjectRoot();
    for (let round = 0; round < ROUNDS; round++) {
      const native = {
        cwd,
        session_id: 'concurrent-hooks-probe',
        prompt_id: `turn-${round}`,
      };
      await hook('user-prompt-submit.mjs', {
        ...native,
        hook_event_name: 'UserPromptSubmit',
      });
      const request = {
        action: 'start',
        project_root: cwd,
        task: 'concurrent-checks',
        intent: 'change',
      };
      const start = {
        ...native,
        tool_use_id: `start-${round}`,
        tool_name: 'mcp__plugin_seiri_tools__workflow',
        tool_input: request,
      };
      await hook('pre-tool-use.mjs', {
        ...start,
        hook_event_name: 'PreToolUse',
      });
      await hook('post-tool-use.mjs', {
        ...start,
        hook_event_name: 'PostToolUse',
        tool_response: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'accepted',
              action: 'start',
              task: request.task,
              intent: 'change',
            }),
          },
        ],
      });
      const calls = ['first', 'second'].map((name) => ({
        ...native,
        tool_use_id: `${name}-${round}`,
        tool_name: 'Bash',
        tool_input: { command: `exit 1 # ${name}` },
      }));

      await Promise.all(
        calls.map((call) =>
          hook('pre-tool-use.mjs', { ...call, hook_event_name: 'PreToolUse' }),
        ),
      );
      expect(Object.keys(state(cwd).invocations)).toHaveLength(2);
      await Promise.all(
        calls.map((call) =>
          hook('post-tool-use.mjs', {
            ...call,
            hook_event_name: 'PostToolUseFailure',
            error: 'Exit code 1',
            is_interrupt: false,
          }),
        ),
      );

      const stored = state(cwd);
      expect(stored.binding.task).toBe('concurrent-checks');
      expect(Object.values(stored.binding.counts)).toEqual([1, 1]);
      expect(stored.invocations).toEqual({});
    }
  }, 60_000);
});
