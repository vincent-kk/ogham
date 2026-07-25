import type { ArtifactAction } from "../../types/artifacts.js";

export function isMutatingRuleAction(action: ArtifactAction): boolean {
  return (
    action === "copy" ||
    action === "update" ||
    action === "remove" ||
    action === "relocate"
  );
}
