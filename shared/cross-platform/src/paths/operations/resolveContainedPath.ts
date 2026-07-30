import { portableIsAbsolute } from "../compat/operations/portableIsAbsolute.js";
import { portableRelative } from "../compat/operations/portableRelative.js";
import { portableResolve } from "../compat/operations/portableResolve.js";

export function resolveContainedPath(
  root: string,
  ...segments: string[]
): string {
  if (!portableIsAbsolute(root))
    throw new Error(`Root path must be absolute; received "${root}"`);

  for (const segment of segments) {
    if (portableIsAbsolute(segment))
      throw new Error(
        `Contained path segment must not be absolute: "${segment}"`,
      );

    if (segment.split(/[\\/]/).includes(".."))
      throw new Error(
        `Contained path segment must not use traversal: "${segment}"`,
      );
  }

  const resolvedRoot = portableResolve(root);
  const result = portableResolve(resolvedRoot, ...segments);
  const relative = portableRelative(resolvedRoot, result);
  if (
    portableIsAbsolute(relative) ||
    relative === ".." ||
    relative.startsWith("../") ||
    relative.startsWith("..\\")
  )
    throw new Error(`Resolved path must remain inside root: "${result}"`);

  return result;
}
