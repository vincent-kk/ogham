/**
 * @file core/paths.ts
 * @description Path resolution for .imbas/ directory structure
 */

import { join } from 'node:path';

/** Returns root .imbas/ directory */
export function getImbasRoot(cwd: string): string {
  return join(cwd, '.imbas');
}

/** Returns .imbas/<KEY>/ */
export function getProjectDir(cwd: string, projectKey: string): string {
  return join(getImbasRoot(cwd), projectKey);
}

/** Returns .imbas/<KEY>/cache/ */
export function getCacheDir(cwd: string, projectKey: string): string {
  return join(getProjectDir(cwd, projectKey), 'cache');
}

/** Returns .imbas/<KEY>/runs/<runId>/ */
export function getRunDir(cwd: string, projectKey: string, runId: string): string {
  return join(getProjectDir(cwd, projectKey), 'runs', runId);
}

/** Returns .imbas/.temp/ */
export function getTempDir(cwd: string): string {
  return join(getImbasRoot(cwd), '.temp');
}

/** Returns .imbas/.temp/<filename>/ */
export function getMediaDir(cwd: string, filename: string): string {
  return join(getTempDir(cwd), filename);
}
