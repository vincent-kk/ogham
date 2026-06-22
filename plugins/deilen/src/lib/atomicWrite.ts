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
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true, mode: options.dirMode ?? DIR_MODE });
  const tmp = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(tmp, data, { mode: options.mode ?? FILE_MODE });
  await rename(tmp, filePath);
}
