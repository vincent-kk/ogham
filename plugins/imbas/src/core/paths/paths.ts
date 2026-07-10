/**
 * @file paths.ts
 * @description Path resolution for .imbas/ directory structure
 */
import { join } from 'node:path';

import { IMBAS_ROOT_DIRNAME, RUNS_DIRNAME } from '../../constants/index.js';

import { projectDirName } from './utils/projectDirName.js';

/** Returns root .imbas/ directory */
export function getImbasRoot(cwd: string): string {
  return join(cwd, IMBAS_ROOT_DIRNAME);
}

/** Returns .imbas/<KEY>/ (GitHub "owner/repo" → "owner--repo") */
export function getProjectDir(cwd: string, projectKey: string): string {
  return join(getImbasRoot(cwd), projectDirName(projectKey));
}

/** Returns .imbas/<KEY>/cache/ */
export function getCacheDir(cwd: string, projectKey: string): string {
  return join(getProjectDir(cwd, projectKey), 'cache');
}

/** Returns .imbas/<KEY>/runs/ */
export function getRunsDir(cwd: string, projectKey: string): string {
  return join(getProjectDir(cwd, projectKey), RUNS_DIRNAME);
}

/** Returns .imbas/<KEY>/runs/<runId>/ */
export function getRunDir(
  cwd: string,
  projectKey: string,
  runId: string,
): string {
  if (
    !runId ||
    runId === '.' ||
    runId === '..' ||
    runId.includes('/') ||
    runId.includes('\\') ||
    runId.includes('\0')
  )
    throw new Error(`Invalid run_id: "${runId}"`);

  return join(getRunsDir(cwd, projectKey), runId);
}
