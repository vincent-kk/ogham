import { relative, resolve, isAbsolute } from "node:path";
import { projectRoot } from "@ogham/cross-platform/host-paths";
import { TEMP_DIR_NAME } from "../constants/index.js";

/** Validate a save path: reject traversal and always resolve under {projectRoot}/{TEMP_DIR_NAME}/ */
export function validateSavePath(saveTo: string): string {
  if (hasDotDotSegment(saveTo))
    throw new Error("Invalid save path: path traversal detected");

  const cwd = projectRoot();
  const tmpBase = resolve(cwd, TEMP_DIR_NAME);

  let relative = saveTo;

  if (isAbsolute(relative)) {
    const normalized = resolve(saveTo);
    const fromTmp = relativePath(tmpBase, normalized);
    const fromCwd = relativePath(cwd, normalized);
    if (isContained(fromTmp) && fromTmp !== "") relative = fromTmp;
    else if (isContained(fromCwd) && fromCwd !== "")
      relative = fromCwd.replace(new RegExp(`^${TEMP_DIR_NAME}[/\\\\]`), "");
    else
      throw new Error(
        'Invalid save path: absolute paths must be under working directory. Use a relative path (e.g., "KAN-27/file.png")',
      );
  } else relative = saveTo.replace(new RegExp(`^${TEMP_DIR_NAME}[/\\\\]`), "");

  const result = resolve(tmpBase, relative);

  if (!result.startsWith(tmpBase))
    throw new Error(
      `Invalid save path: must resolve under ${TEMP_DIR_NAME} directory`,
    );

  return result;
}

function hasDotDotSegment(path: string): boolean {
  return path.split(/[/\\]/).some((segment) => segment === "..");
}

function relativePath(from: string, to: string): string {
  return relative(from, to);
}

function isContained(rel: string): boolean {
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}
