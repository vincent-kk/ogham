import {
  FAILURE_CHAIN_LINE,
  FAILURE_CHAIN_THRESHOLD,
  TRACKED_COMMANDS_CAP,
} from '../../../constants/failureChain.js';
import { CHAIN_HINT } from '../../../constants/gatesLines.js';
import {
  BASH_TOOL,
  POST_TOOL_FAILURE_EVENT,
} from '../../../constants/hooks.js';
import { EMPTY_RESULT, INJECTION_PREFIX } from '../../../constants/plugin.js';
import { judgeCheckOutcome } from '../../../core/gates/record/judgeCheckOutcome.js';
import { recordCheckOutcome } from '../../../core/gates/record/recordCheckOutcome.js';
import { renderVerdictLine } from '../../../core/gates/render/renderVerdictLine.js';
import { hashCommand } from '../../../core/utils/hashCommand.js';
import type { RecordedVerdict } from '../../../types/gates.js';
import type {
  HookOutput,
  PostToolUseFailureInput,
  PostToolUseInput,
} from '../../../types/hooks.js';
import type { WorkflowBinding } from '../../../types/workflow.js';
import { workflowHash } from '../../shared/workflowHost/workflowHash.js';

import { toCheckOutcome } from './toCheckOutcome.js';

/**
 * Judge one Bash payload, retain failure-chain state, and inject one line.
 *
 * @param input Successful or failed Bash hook payload.
 * @returns Non-blocking gate verdict, chain hint, or empty result.
 */
export function bashOutcome(
  input: PostToolUseInput | PostToolUseFailureInput,
  binding: WorkflowBinding,
): HookOutput {
  const command = input.tool_input?.command;
  if (
    input.tool_name !== BASH_TOOL ||
    typeof command !== 'string' ||
    command.trim() === ''
  )
    return EMPTY_RESULT;

  const outcome = toCheckOutcome(input);
  if (outcome.interrupted) return EMPTY_RESULT;

  let verdicts: RecordedVerdict[];
  try {
    verdicts = recordCheckOutcome(
      input.cwd,
      command,
      outcome,
      input.agent_id,
      binding.task,
    );
  } catch {
    verdicts = [];
  }

  const anyUnmet = verdicts.some((result) => result.verdict.kind === 'unmet');
  const allMet =
    verdicts.length > 0 &&
    verdicts.every((result) => result.verdict.kind === 'met');

  /** True when failure is known, false when success is known, or undefined. */
  const failed =
    input.hook_event_name === POST_TOOL_FAILURE_EVENT
      ? true
      : outcome.exit !== undefined
        ? outcome.exit !== 0
        : anyUnmet
          ? true
          : allMet
            ? false
            : undefined;

  let announce = false;
  const key = hashCommand(command);
  if (failed === true) {
    binding.counts[key] = (binding.counts[key] ?? 0) + 1;
    announce =
      binding.counts[key] >= FAILURE_CHAIN_THRESHOLD &&
      !binding.announced.includes(key);
    if (announce) binding.announced.push(key);
  } else if (failed === false) {
    delete binding.counts[key];
    binding.announced = binding.announced.filter((hash) => hash !== key);
  }
  for (const old of Object.keys(binding.counts).slice(
    0,
    -TRACKED_COMMANDS_CAP,
  )) {
    delete binding.counts[old];
    binding.announced = binding.announced.filter((hash) => hash !== old);
  }

  const fingerprint = workflowHash(
    JSON.stringify([
      verdicts.map((result) => {
        const { verdict, evidence } = judgeCheckOutcome(result.gate, outcome);
        return [
          result.gate.id,
          verdict.kind,
          verdict.kind === 'met' ? evidence : verdict.reason,
        ];
      }),
      input.agent_id,
    ]),
  );
  const repeated = binding.verdicts[key] === fingerprint;
  binding.verdicts[key] = fingerprint;
  for (const old of Object.keys(binding.verdicts).slice(
    0,
    -TRACKED_COMMANDS_CAP,
  ))
    delete binding.verdicts[old];
  if (repeated && !announce) return EMPTY_RESULT;

  if (verdicts.length === 0) {
    if (!announce) return EMPTY_RESULT;
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: input.hook_event_name,
        additionalContext: `${INJECTION_PREFIX} ${FAILURE_CHAIN_LINE}`,
      },
    };
  }

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: input.hook_event_name,
      additionalContext: `${INJECTION_PREFIX} ${renderVerdictLine(verdicts, {
        agentId: input.agent_id,
        chainHint: announce ? CHAIN_HINT : undefined,
      })}`,
    },
  };
}
