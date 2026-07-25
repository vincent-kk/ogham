import { lstatSync } from "node:fs";

import { portableJoin, portableRelative } from "../../paths/index.js";
import { hasCode } from "../helpers/hasCode.js";

export function assertNoSymlinkDescendantsSync(
  root: string,
  targetPath: string,
): void {
  const relative = portableRelative(root, targetPath);
  if (
    relative === ".." ||
    relative.startsWith("../") ||
    relative.startsWith("..\\")
  )
    throw new Error(`Target path must remain inside root: "${targetPath}"`);

  const segments = relative
    .split(/[\\/]/)
    .filter((segment) => segment !== "" && segment !== ".");
  let current = root;

  for (const segment of segments) {
    current = portableJoin(current, segment);
    try {
      if (lstatSync(current).isSymbolicLink())
        throw new Error(
          `Target path crosses a symbolic link below root: "${current}"`,
        );
    } catch (error) {
      if (hasCode(error, "ENOENT")) return;
      throw error;
    }
  }
}
