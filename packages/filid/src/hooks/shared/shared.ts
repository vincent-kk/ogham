/**
 * Shared utilities for hook modules.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Check if the cwd is an FCA-AI project.
 * Treats presence of .filid/ directory or INTENT.md as indicator.
 */
export function isFcaProject(cwd: string): boolean {
  return existsSync(join(cwd, '.filid')) || existsSync(join(cwd, 'INTENT.md'));
}

/**
 * Extract the filename from a path, handling both / and \ separators.
 */
function fileBasename(filePath: string): string {
  const lastSlash = Math.max(
    filePath.lastIndexOf('/'),
    filePath.lastIndexOf('\\'),
  );
  return lastSlash === -1 ? filePath : filePath.slice(lastSlash + 1);
}

/**
 * Check if a file path targets INTENT.md.
 * Handles both POSIX (/) and Windows (\) path separators.
 */
export function isIntentMd(filePath: string): boolean {
  return fileBasename(filePath) === 'INTENT.md';
}

/**
 * Check if a file path targets DETAIL.md.
 * Handles both POSIX (/) and Windows (\) path separators.
 */
export function isDetailMd(filePath: string): boolean {
  return fileBasename(filePath) === 'DETAIL.md';
}
