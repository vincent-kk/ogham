import { TASK_NAME_PATTERN } from '../../../constants/gates.js';
import type { WorkflowState } from '../../../types/workflow.js';

import { parseWorkflowRequest } from './parseWorkflowRequest.js';

/** Narrow JSON maps; arrays and null cannot stand in for state records. */
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Validate bounded persisted actor data before any callback can cause effects. */
export function isWorkflowState(value: unknown): value is WorkflowState {
  if (
    !record(value) ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.generation) ||
    (value.generation as number) < 0 ||
    typeof value.lastObservedAt !== 'number' ||
    !Number.isFinite(value.lastObservedAt)
  )
    return false;
  if (value.turn !== undefined && typeof value.turn !== 'string') return false;
  if (
    !Array.isArray(value.seen) ||
    value.seen.length > 4096 ||
    !value.seen.every((v) => typeof v === 'string')
  )
    return false;
  if (!record(value.invocations) || Object.keys(value.invocations).length > 128)
    return false;
  for (const call of Object.values(value.invocations)) {
    if (
      !record(call) ||
      !Number.isSafeInteger(call.generation) ||
      (call.generation as number) < 0 ||
      typeof call.turn !== 'string' ||
      typeof call.inputHash !== 'string' ||
      typeof call.startedAt !== 'number' ||
      !Number.isFinite(call.startedAt) ||
      call.startedAt < 0
    )
      return false;
    if (
      call.kind === 'workflow'
        ? parseWorkflowRequest(call.request) === undefined
        : call.kind !== 'bash' || call.request !== undefined
    )
      return false;
  }
  const binding = value.binding;
  if (binding === undefined) return true;
  if (
    !record(binding) ||
    typeof binding.task !== 'string' ||
    !TASK_NAME_PATTERN.test(binding.task) ||
    !['change', 'review'].includes(binding.intent as string) ||
    !['active', 'suspended'].includes(binding.state as string)
  )
    return false;
  if (
    !record(binding.counts) ||
    Object.keys(binding.counts).length > 32 ||
    !Object.values(binding.counts).every(
      (v) => Number.isSafeInteger(v) && (v as number) >= 0,
    )
  )
    return false;
  if (
    !Array.isArray(binding.announced) ||
    binding.announced.length > 32 ||
    !binding.announced.every((v) => typeof v === 'string')
  )
    return false;
  return (
    record(binding.verdicts) &&
    Object.keys(binding.verdicts).length <= 32 &&
    Object.values(binding.verdicts).every((v) => typeof v === 'string')
  );
}
