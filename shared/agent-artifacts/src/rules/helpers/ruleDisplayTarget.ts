import { normalize } from "@ogham/cross-platform/paths/normalize";
import { portableRelative } from "@ogham/cross-platform/paths/relative";

export function ruleDisplayTarget(root: string, target: string): string {
  return normalize(portableRelative(root, target));
}
