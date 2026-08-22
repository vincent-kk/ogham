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

/** First command written verbatim into the concurrent ledger. */
const G1_COMMAND = 'yarn verify:g1';

/** Second command written verbatim into the concurrent ledger. */
const G2_COMMAND = 'yarn verify:g2';

/** Unmet ledger restored before every concurrent pair. */
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

/**
 * Create a throwaway project with strict dial and one task directory.
 *
 * @returns Project root discovered by the bundled hook.
 */
function makeProjectRoot(): string {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-gates-race-'));
  const taskDir = portableJoin(root, '.seiri', 'tasks', 'concurrent-task');
  const configPath = portableJoin(root, '.seiri', 'config.json');
  createdRoots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  mkdirSync(taskDir, { recursive: true });
  writeFileSync(configPath, '{"intervention":"strict"}');
  return root;
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

describe('concurrent gate hook writes', () => {
  it('keeps both gate proofs across concurrent hook processes', async () => {
    if (!existsSync(bundlePath))
      throw new Error(
        `bridge bundle missing at ${bundlePath} — run \`yarn build:hooks\` before this suite`,
      );

    const root = makeProjectRoot();
    const ledgerPath = portableJoin(
      root,
      '.seiri',
      'tasks',
      'concurrent-task',
      'gates.md',
    );
    const lostG1: number[] = [];
    const lostG2: number[] = [];

    for (let round = 0; round < ROUNDS; round += 1) {
      writeFileSync(ledgerPath, LEDGER);

      await Promise.all([
        spawnCli('node', [bundlePath], {
          input: hookPayload(root, G1_COMMAND, 'G1 passed'),
        }),
        spawnCli('node', [bundlePath], {
          input: hookPayload(root, G2_COMMAND, 'G2 passed'),
        }),
      ]);

      const stored = readFileSync(ledgerPath, 'utf8');
      if (!stored.includes('- [x] G1')) lostG1.push(round);
      if (!stored.includes('- [x] G2')) lostG2.push(round);
    }

    expect({ lostG1, lostG2 }).toEqual({ lostG1: [], lostG2: [] });
  }, 60_000);
});
