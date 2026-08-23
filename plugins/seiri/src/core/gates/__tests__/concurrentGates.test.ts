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
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { EVIDENCE_PENDING } from '../../../constants/gates.js';
import { parseGatesLedger } from '../parse/parseGatesLedger.js';

/** Package root used to locate the hook artifact exercised in production. */
const packageRoot = portableJoin(
  portableDirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
);

/** Built PostToolUse hook executed by the host. */
const bundlePath = portableJoin(packageRoot, 'bridge', 'post-tool-use.mjs');

/** Session identifier shared by concurrent hook processes. */
const SESSION_ID = 'concurrent-gates-probe';

/** Number of fresh ledger races exercised by the regression test. */
const ROUNDS = 12;

/** One hook process: the command it reports and the proof that command prints. */
const GATE_RUNS = [
  { id: 'G1', command: 'yarn verify:g1', proof: 'G1 passed' },
  { id: 'G2', command: 'yarn verify:g2', proof: 'G2 passed' },
] as const;

/** Unmet ledger restored before every pair of hook processes. */
const LEDGER = `# Gates: concurrent-task

- [ ] G1: first verification passes
  CHECK: yarn verify:g1
  EXPECT: G1 passed
  EVIDENCE: pending

- [ ] G2: second verification passes
  CHECK: yarn verify:g2
  EXPECT: G2 passed
  EVIDENCE: pending
`;

/** Temporary project roots removed after the suite. */
const createdRoots: string[] = [];

afterAll(() => {
  for (const root of createdRoots)
    rmSync(root, { recursive: true, force: true });
});

beforeAll(() => {
  if (!existsSync(bundlePath))
    throw new Error(
      `bridge bundle missing at ${bundlePath} — run \`yarn build:hooks\` before this suite`,
    );
});

/**
 * Create a throwaway project with strict dial, one task, and a fresh ledger.
 *
 * @returns Project root and the ledger path the bundled hook will rewrite.
 */
function makeProject(): { root: string; ledgerPath: string } {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-gates-race-'));
  const taskDir = portableJoin(root, '.seiri', 'tasks', 'concurrent-task');
  createdRoots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  mkdirSync(taskDir, { recursive: true });
  writeFileSync(
    portableJoin(root, '.seiri', 'config.json'),
    '{"intervention":"strict"}',
  );
  const ledgerPath = portableJoin(taskDir, 'gates.md');
  writeFileSync(ledgerPath, LEDGER);
  return { root, ledgerPath };
}

/**
 * Serialize one successful Bash payload as the hook host supplies it.
 *
 * @param root Project working directory.
 * @param command Exact CHECK command.
 * @param stdout Observable proof text.
 * @returns JSON stdin for one hook process.
 */
function hookPayload(root: string, command: string, stdout: string): string {
  return JSON.stringify({
    cwd: root,
    session_id: SESSION_ID,
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    tool_input: { command },
    tool_response: { stdout, stderr: '' },
  });
}

/**
 * Read one stored ledger as the outcome a single writer could have produced.
 *
 * Fails when the ledger lost a gate, lost a CHECK or EXPECT, or pairs a
 * checkbox with evidence no single writer would have written beside it —
 * the damage an unserialised read-modify-write would leave behind.
 *
 * @param ledgerPath Absolute path of the ledger both hook processes rewrite.
 * @returns Identifiers of the gates whose proof survived, in source order.
 */
function provenGates(ledgerPath: string): string[] {
  const { gates } = parseGatesLedger(readFileSync(ledgerPath, 'utf8'));
  expect(gates.map((gate) => gate.id)).toEqual(GATE_RUNS.map((run) => run.id));

  return GATE_RUNS.flatMap((run, index) => {
    const gate = gates[index];
    expect([gate?.check, gate?.expect]).toEqual([run.command, run.proof]);
    expect(gate?.evidence).toBe(gate?.checked ? run.proof : EVIDENCE_PENDING);
    return gate?.checked === true ? [run.id] : [];
  });
}

describe('gate hook writes', () => {
  it('records every proof when hook processes do not contend', async () => {
    const { root, ledgerPath } = makeProject();

    for (const run of GATE_RUNS)
      await spawnCli('node', [bundlePath], {
        input: hookPayload(root, run.command, run.proof),
      });

    expect(provenGates(ledgerPath)).toEqual(['G1', 'G2']);
  }, 30_000);

  it('leaves a legal single-writer ledger under concurrency', async () => {
    const { root, ledgerPath } = makeProject();
    const outcomes: string[][] = [];

    for (let round = 0; round < ROUNDS; round += 1) {
      writeFileSync(ledgerPath, LEDGER);

      await Promise.all(
        GATE_RUNS.map((run) =>
          spawnCli('node', [bundlePath], {
            input: hookPayload(root, run.command, run.proof),
          }),
        ),
      );

      outcomes.push(provenGates(ledgerPath));
    }

    // A serialised round proves both gates; a round that fails open keeps the
    // last writer's proof. An empty round means no writer's proof survived at
    // all, which the atomic replacement is supposed to make impossible.
    expect(outcomes.filter((proven) => proven.length === 0)).toEqual([]);
  }, 60_000);
});
