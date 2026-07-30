import { normalize, portableRelative } from "@ogham/cross-platform";

export function ruleDisplayTarget(root: string, target: string): string {
  return normalize(portableRelative(root, target));
}
