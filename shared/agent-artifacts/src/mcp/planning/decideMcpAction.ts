import type { ArtifactAction } from "../../types/artifacts.js";

export type McpObservedState =
  "missing" | "matching" | "drift" | "conflict" | "invalid";

export function decideMcpAction(options: {
  readonly observed: McpObservedState;
  readonly desired: boolean;
  readonly replaceDrift: boolean;
}): ArtifactAction {
  if (options.observed === "invalid" || options.observed === "conflict")
    return "conflict";

  if (options.observed === "missing")
    return options.desired ? "copy" : "unchanged";

  if (!options.desired) return "remove";
  if (options.observed === "matching") return "unchanged";
  return options.replaceDrift ? "update" : "drift";
}
