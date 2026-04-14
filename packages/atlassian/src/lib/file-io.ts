import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ZodType } from 'zod';

/** Read and parse a JSON file with optional Zod validation */
export async function readJson<T>(path: string, schema?: ZodType<T>): Promise<T>;
export async function readJson<T>(path: string, schema: ZodType<T> | undefined, fallback: T): Promise<T>;
export async function readJson<T>(path: string, schema?: ZodType<T>, fallback?: T): Promise<T> {
  let content: string;
  try {
    content = await readFile(path, 'utf-8');
  } catch (error) {
    if (fallback !== undefined && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
  const data = JSON.parse(content);
  if (schema) {
    return schema.parse(data);
  }
  return data as T;
}

/** Write JSON to file, creating parent directories as needed */
export async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/** Write binary data to file, creating parent directories as needed */
export async function writeBinary(path: string, data: ArrayBuffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, Buffer.from(data));
}
