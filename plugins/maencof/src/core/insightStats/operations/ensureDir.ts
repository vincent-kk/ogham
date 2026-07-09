/**
 * @file ensureDir.ts
 * @description Create the parent directory of a file path if it does not exist.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
