import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import type { CheckOutcome } from '../../../types/gates.js';
import type {
  PostToolUseFailureInput,
  PostToolUseInput,
} from '../../../types/hooks.js';
import { processToolOutcome } from '../postToolUse.js';
import { toCheckOutcome } from '../utils/toCheckOutcome.js';

/** Runnable command shared by every host payload fixture. */
const COMMAND = 'yarn host-parity';

/** Ledger bytes used to compare host-normalized writes. */
const LEDGER = `- [ ] G1: host parity passes
  CHECK: yarn host-parity
  EXPECT: HOST_PARITY_OK
  EVIDENCE: pending
`;

/** Temporary repositories created by the host payload fixtures. */
const createdRoots: string[] = [];

/** One host payload and its contract result. */
interface HostPayloadCase {
  /** Produce the host hook payload for one repository. */
  input: (root: string) => PostToolUseInput | PostToolUseFailureInput;
  /** Exact host-neutral representation expected before judgment. */
  outcome: CheckOutcome;
  /** Verdict fragment expected from the hook. */
  verdict: string;
  /** Complete evidence value expected after the call. */
  evidence: string;
  /** Whether the gate must be checked after the call. */
  checked: boolean;
}

afterEach(() => {
  for (const root of createdRoots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/**
 * Create one repository and seed the shared gate ledger.
 *
 * @returns Repository root and absolute ledger path.
 */
function seedRepo(): { root: string; path: string } {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-host-parity-'));
  createdRoots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  const taskDir = portableJoin(root, '.seiri', 'tasks', 'host-parity');
  mkdirSync(taskDir, { recursive: true });
  const path = portableJoin(taskDir, 'gates.md');
  writeFileSync(path, LEDGER);
  return { root, path };
}

/**
 * Assert one host payload against the shared verdict and ledger contract.
 *
 * @param fixture Host payload factory and expected persisted result.
 */
function assertHostPayload({
  input,
  outcome,
  verdict,
  evidence,
  checked,
}: HostPayloadCase): void {
  const { root, path } = seedRepo();
  const payload = input(root);
  expect(toCheckOutcome(payload)).toEqual(outcome);
  const output = processToolOutcome(payload);
  expect(output.hookSpecificOutput?.additionalContext).toContain(verdict);
  const ledger = readFileSync(path, 'utf8');
  expect(ledger).toContain(`- [${checked ? 'x' : ' '}] G1`);
  expect(ledger).toContain(`EVIDENCE: ${evidence}`);
}

describe('PostToolUse host payload parity', () => {
  it('normalizes a Claude success object', () => {
    assertHostPayload({
      input: (root) => ({
        cwd: root,
        session_id: 'session-a',
        hook_event_name: 'PostToolUse',
        tool_name: 'Bash',
        tool_input: { command: COMMAND },
        tool_response: {
          stdout: 'starting\nHOST_PARITY_OK\ncomplete',
          stderr: '',
        },
      }),
      outcome: { text: 'starting\nHOST_PARITY_OK\ncomplete', exit: 0 },
      verdict: 'G1 met — evidence recorded',
      evidence: 'HOST_PARITY_OK | complete',
      checked: true,
    });
  });

  it('normalizes a Claude failure error', () => {
    assertHostPayload({
      input: (root) => ({
        cwd: root,
        session_id: 'session-a',
        hook_event_name: 'PostToolUseFailure',
        tool_name: 'Bash',
        tool_input: { command: COMMAND },
        error: 'Exit code 7\nstarting\nHOST_PARITY_OK\ncomplete',
        is_interrupt: false,
      }),
      outcome: {
        text: 'starting\nHOST_PARITY_OK\ncomplete',
        exit: 7,
      },
      verdict: 'G1 met — evidence recorded',
      evidence: 'HOST_PARITY_OK | complete (exit 7)',
      checked: true,
    });
  });

  it('normalizes a Codex string response', () => {
    assertHostPayload({
      input: (root) =>
        ({
          cwd: root,
          session_id: 'session-a',
          hook_event_name: 'PostToolUse',
          tool_name: 'Bash',
          tool_input: { command: COMMAND },
          tool_response: 'starting\nHOST_PARITY_OK\ncomplete',
          turn_id: 'turn-a',
          model: 'gpt-5',
          permission_mode: 'default',
        }) as PostToolUseInput,
      outcome: { text: 'starting\nHOST_PARITY_OK\ncomplete' },
      verdict: 'G1 met — evidence recorded',
      evidence: 'HOST_PARITY_OK | complete',
      checked: true,
    });
  });

  it('normalizes a Codex response with a classic exit header', () => {
    assertHostPayload({
      input: (root) =>
        ({
          cwd: root,
          session_id: 'session-a',
          hook_event_name: 'PostToolUse',
          tool_name: 'Bash',
          tool_input: { command: COMMAND },
          tool_response: 'Exit code: 7\nstarting\nHOST_PARITY_OK\ncomplete',
        }) as PostToolUseInput,
      outcome: {
        text: 'starting\nHOST_PARITY_OK\ncomplete',
        exit: 7,
      },
      verdict: 'G1 met — evidence recorded',
      evidence: 'HOST_PARITY_OK | complete (exit 7)',
      checked: true,
    });
  });

  it('keeps an empty Codex string response conservatively unmet', () => {
    assertHostPayload({
      input: (root) =>
        ({
          cwd: root,
          session_id: 'session-a',
          hook_event_name: 'PostToolUse',
          tool_name: 'Bash',
          tool_input: { command: COMMAND },
          tool_response: '',
        }) as PostToolUseInput,
      outcome: { text: '' },
      verdict: 'G1 unmet — no output',
      evidence: 'pending',
      checked: false,
    });
  });
});
