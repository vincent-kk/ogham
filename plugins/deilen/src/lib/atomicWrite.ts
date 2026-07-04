import { randomBytes } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { DIR_MODE, FILE_MODE } from "../constants/defaults.js";

export interface AtomicWriteOptions {
  mode?: number;
  dirMode?: number;
}

export async function atomicWrite(
  filePath: string,
  data: string | Uint8Array,
  options: AtomicWriteOptions = {},
): Promise<void> {
  const directory = dirname(filePath);
  await mkdir(directory, {
    recursive: true,
    mode: options.dirMode ?? DIR_MODE,
  });
  const temporaryPath = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(temporaryPath, data, { mode: options.mode ?? FILE_MODE });
  await rename(temporaryPath, filePath);
}
