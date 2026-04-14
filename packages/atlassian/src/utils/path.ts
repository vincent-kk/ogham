import { resolve, isAbsolute } from "node:path";
import { TEMP_DIR_NAME } from "../constants/index.js";

/** Validate a save path: reject traversal and always resolve under {cwd}/{TEMP_DIR_NAME}/ */
export function validateSavePath(saveTo: string): string {
  if (saveTo.includes("..")) {
    throw new Error("Invalid save path: path traversal detected");
  }

  const cwd = process.cwd();
  const tmpBase = resolve(cwd, TEMP_DIR_NAME);

  let relative = saveTo;

  if (isAbsolute(relative)) {
    const normalized = resolve(saveTo);
    if (normalized.startsWith(tmpBase + "/")) {
      relative = normalized.slice(tmpBase.length + 1);
    } else if (normalized.startsWith(cwd + "/")) {
      relative = normalized.slice(cwd.length + 1).replace(new RegExp(`^${TEMP_DIR_NAME}[/\\\\]`), "");
    } else {
      throw new Error(
        'Invalid save path: absolute paths must be under working directory. Use a relative path (e.g., "KAN-27/file.png")',
      );
    }
  } else {
    relative = saveTo.replace(new RegExp(`^${TEMP_DIR_NAME}[/\\\\]`), "");
  }

  const result = resolve(tmpBase, relative);

  if (!result.startsWith(tmpBase)) {
    throw new Error(`Invalid save path: must resolve under ${TEMP_DIR_NAME} directory`);
  }

  return result;
}
