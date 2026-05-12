import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { dirname } from "node:path";
import type { ZodType } from "zod";

/** Read and parse a JSON file with optional Zod validation */
export async function readJson<T>(
  path: string,
  schema?: ZodType<T>,
): Promise<T>;
export async function readJson<T>(
  path: string,
  schema: ZodType<T> | undefined,
  fallback: T,
): Promise<T>;
export async function readJson<T>(
  path: string,
  schema?: ZodType<T>,
  fallback?: T,
): Promise<T> {
  let content: string;
  try {
    content = await readFile(path, "utf-8");
  } catch (error) {
    if (
      fallback !== undefined &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    )
      return fallback;
    throw error;
  }
  const data = JSON.parse(content);
  if (schema) {
    return schema.parse(data);
  }
  return data as T;
}

/** Write JSON to file, creating parent directories as needed. Passes mode to
 *  writeFile so newly created files are born with the requested permissions —
 *  this closes the brief time-of-check / time-of-use window where umask
 *  defaults would otherwise leak between writeFile and chmod. The chmod call
 *  remains to repair pre-existing files whose permissions drifted. */
export async function writeJson(
  path: string,
  data: unknown,
  options?: { mode?: number },
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", {
    encoding: "utf-8",
    ...(options?.mode !== undefined && { mode: options.mode }),
  });
  if (options?.mode !== undefined) await chmod(path, options.mode);
}

/** Write binary data to file, creating parent directories as needed */
export async function writeBinary(
  path: string,
  data: ArrayBuffer,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, Buffer.from(data));
}
