import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { portableDirname, portableJoin, spawnCli } from '@ogham/cross-platform';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * Two hook processes, one state file.
 *
 * `hooks.json` runs every hook as its own `node` process, so one message
 * that calls `Skill` and `Bash` together puts two PostToolUse handlers on
 * `.seiri/session-signals.json` at the same instant. Each does read →
 * modify → write; without serialisation the later writer holds a snapshot
 * taken before the earlier one landed, and silently drops the field it
 * never knew about. Which field disappears is down to timing: the workflow
 * hand-off, costing the next turn its state clause, or the failure counter,
 * costing a repeating command its chain warning. Both were measured before
 * the lock — 10/20 and 5/20 over the same 20 rounds — so both are checked
 * here; asserting one direction would pass while the other still lost
 * writes.
 *
 * Run against `bridge/`, because that bundle is the artifact `hooks.json`
 * actually executes — verifying the sources it was built from would pass
 * while the shipped hook still lost writes.
 *
 * The Bash side must be a *failure*: `recordBashSuccess` returns without
 * writing when there is no chain to forget, and a path that never writes
 * cannot race. A success payload here would report a green that means
 * nothing.
 */
const packageRoot = portableJoin(
  portableDirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
);
const bundlePath = portableJoin(packageRoot, 'bridge', 'post-tool-use.mjs');
const SESSION_ID = 'concurrent-hooks-probe';
const ROUNDS = 12;

const createdRoots: string[] = [];

afterAll(() => {
  for (const root of createdRoots)
    rmSync(root, { recursive: true, force: true });
});

/** A throwaway project root holding a strict dial, so the hooks do not gate out. */
function makeProjectRoot(): string {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-signals-'));
  createdRoots.push(root);
  mkdirSync(portableJoin(root, '.seiri'));
  writeFileSync(
    portableJoin(root, '.seiri', 'config.json'),
    '{"intervention":"strict"}',
  );
  return root;
}

/** One hook invocation's stdin payload, shaped as the host delivers it. */
function hookPayload(root: string, event: string, tool: string): string {
  const toolInput =
    tool === 'Skill'
      ? { skill: 'seiri:verify' }
      : { command: 'exit 1 # concurrent-probe' };
  return JSON.stringify({
    cwd: root,
    session_id: SESSION_ID,
    hook_event_name: event,
    tool_name: tool,
    tool_input: toolInput,
    error: 'probe',
    is_interrupt: false,
  });
}

describe('concurrent PostToolUse hooks', () => {
  it('keeps both fields when two hooks write at the same instant', async () => {
    if (!existsSync(bundlePath))
      throw new Error(
        `bridge bundle missing at ${bundlePath} — run \`yarn build:hooks\` before this suite`,
      );

    const root = makeProjectRoot();
    const signalsPath = portableJoin(root, '.seiri', 'session-signals.json');
    const lostWorkflow: number[] = [];
    const lostCounts: number[] = [];

    for (let round = 0; round < ROUNDS; round += 1) {
      writeFileSync(
        signalsPath,
        JSON.stringify({ sessionId: SESSION_ID, counts: {}, announced: [] }),
      );

      await Promise.all([
        spawnCli('node', [bundlePath], {
          input: hookPayload(root, 'PostToolUse', 'Skill'),
        }),
        spawnCli('node', [bundlePath], {
          input: hookPayload(root, 'PostToolUseFailure', 'Bash'),
        }),
      ]);

      const stored = JSON.parse(readFileSync(signalsPath, 'utf8')) as {
        workflow?: unknown;
        counts?: Record<string, number>;
      };
      if (stored.workflow === undefined) lostWorkflow.push(round);
      if (Object.keys(stored.counts ?? {}).length === 0) lostCounts.push(round);
    }

    expect({ lostWorkflow, lostCounts }).toEqual({
      lostWorkflow: [],
      lostCounts: [],
    });
  }, 60_000);
});
