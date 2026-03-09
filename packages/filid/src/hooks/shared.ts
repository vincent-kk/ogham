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
  return (
    existsSync(join(cwd, '.filid')) ||
    existsSync(join(cwd, 'INTENT.md'))
  );
}

/**
 * Check if a file path targets INTENT.md.
 */
export function isIntentMd(filePath: string): boolean {
  return (
    filePath.endsWith('/INTENT.md') ||
    filePath === 'INTENT.md'
  );
}

/**
 * Check if a file path targets DETAIL.md.
 */
export function isDetailMd(filePath: string): boolean {
  return (
    filePath.endsWith('/DETAIL.md') ||
    filePath === 'DETAIL.md'
  );
}

