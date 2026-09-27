import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { rm } from 'node:fs/promises';
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
/** Projects created by this bundle-level suite. */
const roots: string[] = [];

afterAll(async () => {
  for (const root of roots)
    await rm(root, { recursive: true, force: true, maxRetries: 3 });
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

describe('paired hook process isolation', () => {
  it.each([
    { scenario: 'in order', reverse: false, contended: false, race: false },
    {
      scenario: 'in reverse order',
      reverse: true,
      contended: false,
      race: false,
    },
    {
      scenario: 'after lock contention',
      reverse: false,
      contended: true,
      race: false,
    },
    {
      scenario: 'racing for a free lock',
      reverse: false,
      contended: false,
      race: true,
    },
  ])(
    'preserves both calls $scenario',
    async ({ reverse, contended, race }) => {
      const cwd = makeProjectRoot();
      const native = {
        cwd,
        session_id: 'concurrent-hooks-probe',
        prompt_id: 'turn',
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
        tool_use_id: 'start',
        tool_name: 'mcp__plugin_seiri_tools__runtime',
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
        tool_use_id: name,
        tool_name: 'Bash',
        tool_input: { command: `exit 1 # ${name}` },
      }));

      const pre = (call: (typeof calls)[number]) =>
        hook('pre-tool-use.mjs', { ...call, hook_event_name: 'PreToolUse' });
      if (race) await Promise.all(calls.map(pre));
      else for (const call of calls) await pre(call);
      expect(Object.keys(state(cwd).invocations)).toHaveLength(2);

      const posts = calls.map((call) => ({
        ...call,
        hook_event_name: 'PostToolUseFailure',
        error: 'Exit code 1',
        is_interrupt: false,
      }));
      if (contended) {
        const dir = portableJoin(cwd, '.seiri', 'sessions');
        const actor = readdirSync(dir).find((name) => name.endsWith('.json'))!;
        const heldLock = portableJoin(dir, `${actor}.lock`);
        const before = state(cwd);
        mkdirSync(heldLock);
        // Keep the fixture lock fresh for the entire test, even on a slow runner.
        const freshUntil = new Date(Date.now() + 60_000);
        utimesSync(heldLock, freshUntil, freshUntil);
        try {
          await Promise.all(
            posts.map((post) => hook('post-tool-use.mjs', post)),
          );
          expect(state(cwd)).toEqual(before);
          expect(existsSync(heldLock)).toBe(true);
        } finally {
          await rm(heldLock, { recursive: true, force: true, maxRetries: 3 });
        }
      }

      if (reverse) posts.reverse();
      if (race)
        await Promise.all(posts.map((post) => hook('post-tool-use.mjs', post)));
      else
        for (const [index, post] of posts.entries()) {
          await hook('post-tool-use.mjs', post);
          const stored = state(cwd);
          expect(Object.values(stored.binding.counts)).toEqual(
            Array(index + 1).fill(1),
          );
          expect(Object.keys(stored.invocations)).toHaveLength(
            posts.length - index - 1,
          );
        }
      const stored = state(cwd);
      expect(stored.binding.task).toBe('concurrent-checks');
      expect(Object.values(stored.binding.counts)).toEqual([1, 1]);
      expect(stored.invocations).toEqual({});
    },
    60_000,
  );
});
