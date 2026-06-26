import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { dirname } from "node:path";
import type { ZodType } from "zod";

/** Read and parse a JSON file with optional Zod validation. */
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
    ) {
      return fallback;
    }
    throw error;
  }
  const data: unknown = JSON.parse(content);
  return schema ? schema.parse(data) : (data as T);
}

/**
 * Write JSON, creating parent dirs. `mode` is passed to writeFile so the file
 * is born with the requested permissions (closes the umask TOCTOU window); the
 * chmod repairs a pre-existing file whose permissions drifted.
 */
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

/** Write binary data to a file, creating parent dirs as needed. */
export async function writeBinary(
  path: string,
  data: ArrayBuffer | Uint8Array,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data instanceof ArrayBuffer ? Buffer.from(data) : data);
}
