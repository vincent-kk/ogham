import { randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  openSync,
  renameSync,
  writeFileSync,
} from "node:fs";

import { portableDirname } from "../../paths/index.js";
import { readModeIfExists } from "../locking/helpers/readModeIfExists.js";
import type { AtomicWriteOptions } from "../types/types.js";
import { ensureDirectorySync } from "./ensureDirectorySync.js";
import { removeFileIfExistsSync } from "./removeFileIfExistsSync.js";

export function writeFileAtomicallySync(
  path: string,
  content: string | Uint8Array,
  options: AtomicWriteOptions = {},
): void {
  const directory = portableDirname(path);
  ensureDirectorySync(directory, { mode: options.directoryMode });

  const existingMode = readModeIfExists(path);
  const fileMode = options.fileMode ?? existingMode;
  const temporaryPath = `${path}.tmp-${randomUUID()}`;
  let descriptor: number | null = null;

  try {
    descriptor = openSync(temporaryPath, "wx", fileMode);
    writeFileSync(descriptor, content);
    closeSync(descriptor);
    descriptor = null;
    if (fileMode !== undefined) chmodSync(temporaryPath, fileMode);
    renameSync(temporaryPath, path);
  } catch (error) {
    if (descriptor !== null) closeSync(descriptor);
    removeFileIfExistsSync(temporaryPath);
    throw error;
  }
}
