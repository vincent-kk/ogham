/**
 * @file lib/file-io.ts
 * @description Atomic JSON file I/O with write-to-temp-then-rename pattern
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';

/**
 * Read a JSON file and optionally validate with a Zod schema.
 * Throws if file not found or JSON is invalid.
 * Sync internals intentional — atomic read in single-threaded MCP stdio.
 */
export async function readJson<T>(
  filePath: string,
  schema?: z.ZodType<T, z.ZodTypeDef, unknown>,
): Promise<T> {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read file: ${filePath}: ${(err as Error).message}`, {
      cause: err,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in file: ${filePath}: ${(err as Error).message}`, {
      cause: err,
    });
  }

  if (schema) {
    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `Schema validation failed for ${filePath}: ${result.error.message}`,
      );
    }
    return result.data;
  }

  return parsed as T;
}

/**
 * Write data as JSON to a file atomically.
 * Writes to a temp file first, then renames to the target path (crash-safe).
 * Sync internals intentional — atomic rename requires no await gap.
 */
export async function writeJson(filePath: string, data: unknown): Promise<void> {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });

  const tempPath = join(dir, `.tmp-${randomUUID()}.json`);
  const json = JSON.stringify(data, null, 2);

  try {
    writeFileSync(tempPath, json, 'utf-8');
    renameSync(tempPath, filePath);
  } catch (err) {
    throw new Error(`Failed to write file: ${filePath}: ${(err as Error).message}`, {
      cause: err,
    });
  }
}
