import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { FAILURE_CHAIN_LINE } from '../../../constants/failureChain.js';
import { CHAIN_HINT } from '../../../constants/gatesLines.js';
import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import type { CheckOutcome } from '../../../types/gates.js';
import type {
  PostToolUseFailureInput,
  PostToolUseInput,
} from '../../../types/hooks.js';
import {
  activateWorkflow,
  observeBash,
} from '../../__tests__/helpers/workflowHarness.js';
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
  writeConfig(root, 'project', { intervention: 'standard' });
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
  const raw = input(root);
  const codex = 'tool_response' in raw && typeof raw.tool_response === 'string';
  const payload = {
    ...raw,
    ...(codex ? { turn_id: 'turn-a' } : { prompt_id: 'turn-a' }),
  };
  activateWorkflow(root, {
    task: 'host-parity',
    session_id: payload.session_id,
    ...(codex ? { turn_id: 'turn-a' } : {}),
  });
  expect(toCheckOutcome(payload)).toEqual(outcome);
  const output = observeBash(payload);
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

  it('keeps a codex failure chain at Claude parity for an unmet CHECK', () => {
    const claudeRoot = seedRepo().root;
    const codexRoot = seedRepo().root;
    activateWorkflow(claudeRoot, {
      task: 'host-parity',
      session_id: 'session-chain',
    });
    activateWorkflow(codexRoot, {
      task: 'host-parity',
      session_id: 'session-chain',
      turn_id: 'turn-a',
    });
    const claudeInput: PostToolUseFailureInput = {
      cwd: claudeRoot,
      session_id: 'session-chain',
      hook_event_name: 'PostToolUseFailure',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      error: 'Exit code 1\nHOST_PARITY_MISSING',
    };
    const codexInput = {
      cwd: codexRoot,
      turn_id: 'turn-a',
      session_id: 'session-chain',
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      tool_response: 'HOST_PARITY_MISSING',
    } as PostToolUseInput;

    const claudeContexts = Array.from(
      { length: 3 },
      () => observeBash(claudeInput).hookSpecificOutput?.additionalContext,
    );
    const codexContexts = Array.from(
      { length: 3 },
      () => observeBash(codexInput).hookSpecificOutput?.additionalContext,
    );

    expect(
      claudeContexts.map((text) => text?.includes(CHAIN_HINT) ?? false),
    ).toEqual([false, false, true]);
    expect(
      codexContexts.map((text) => text?.includes(CHAIN_HINT) ?? false),
    ).toEqual([false, false, true]);
    expect(codexContexts[2]).toContain('G1 unmet');
  });

  it('resets a codex failure chain only after a met CHECK', () => {
    const { root } = seedRepo();
    activateWorkflow(root, {
      task: 'host-parity',
      session_id: 'session-reset',
      turn_id: 'turn-a',
    });
    const input = {
      cwd: root,
      session_id: 'session-reset',
      turn_id: 'turn-a',
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      tool_response: 'HOST_PARITY_MISSING',
    } as PostToolUseInput;

    const contexts = [
      observeBash(input),
      observeBash(input),
      observeBash({ ...input, tool_response: 'HOST_PARITY_OK' }),
      observeBash(input),
      observeBash(input),
    ].map((output) => output.hookSpecificOutput?.additionalContext);

    expect(contexts.every((text) => !text?.includes(CHAIN_HINT))).toBe(true);
  });

  it('leaves codex failure chain state untouched outside the gate ledger', () => {
    const command = 'yarn outside-ledger';
    const freshRoot = seedRepo().root;
    activateWorkflow(freshRoot, {
      task: 'host-parity',
      session_id: 'session-outside',
      turn_id: 'turn-a',
    });
    const freshInput = {
      cwd: freshRoot,
      session_id: 'session-outside',
      turn_id: 'turn-a',
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command },
      tool_response: 'FAIL',
    } as PostToolUseInput;

    const freshContexts = Array.from(
      { length: 3 },
      () => observeBash(freshInput).hookSpecificOutput?.additionalContext,
    );
    expect(freshContexts).toEqual([undefined, undefined, undefined]);
    const sessions = portableJoin(freshRoot, '.seiri', 'sessions');
    const states = readdirSync(sessions)
      .filter((name) => name.endsWith('.json'))
      .map((name) =>
        JSON.parse(readFileSync(portableJoin(sessions, name), 'utf8')),
      );
    expect(
      states.every(
        (state) => Object.keys(state.binding?.counts ?? {}).length === 0,
      ),
    ).toBe(true);

    const preservedRoot = seedRepo().root;
    activateWorkflow(preservedRoot, {
      task: 'host-parity',
      session_id: 'session-preserved',
      turn_id: 'turn-a',
    });
    const knownFailure: PostToolUseInput = {
      cwd: preservedRoot,
      session_id: 'session-preserved',
      turn_id: 'turn-a',
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command },
      tool_response: 'Exit code 1\nFAIL',
    };
    const codexInput = {
      ...freshInput,
      cwd: preservedRoot,
      session_id: 'session-preserved',
    };
    observeBash(knownFailure);
    observeBash(knownFailure);
    Array.from({ length: 3 }, () => observeBash(codexInput));

    const preservedContext =
      observeBash(knownFailure).hookSpecificOutput?.additionalContext;
    expect(preservedContext).toBeDefined();
    expect(preservedContext).toContain(FAILURE_CHAIN_LINE);
  });
});
