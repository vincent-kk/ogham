import { canonicalMcpValue } from "../planning/canonicalMcpValue.js";
import type { McpObservedState } from "../planning/decideMcpAction.js";

export function codexMcpObservedState(
  hasExisting: boolean,
  observed: unknown,
  desired: Readonly<Record<string, unknown>> | null,
): McpObservedState {
  if (!hasExisting) return "missing";
  return desired !== null &&
    canonicalMcpValue(observed) === canonicalMcpValue(desired)
    ? "matching"
    : "drift";
}
