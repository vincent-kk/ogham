import { homedir } from 'node:os';
import { join } from 'node:path';

export const COGAIR_HOME = join(homedir(), '.claude', 'plugins', 'cogair');

export const CONFIG_PATH = join(COGAIR_HOME, 'config.json');
export const SESSIONS_DIR = join(COGAIR_HOME, 'sessions');
export const RUNTIME_DIR = join(COGAIR_HOME, 'runtime');
export const COUNTER_PATH = join(RUNTIME_DIR, 'counter.json');
export const SETTINGS_SERVER_PATH = join(RUNTIME_DIR, 'settings_server.json');
export const GEMINI_CWD_DIR = join(RUNTIME_DIR, 'gemini-cwd');
export const ARTIFACTS_DIR_USER = join(COGAIR_HOME, 'artifacts');

export function sessionDir(projectHash: string): string {
  return join(SESSIONS_DIR, projectHash);
}

export function projectMetaPath(projectHash: string): string {
  return join(sessionDir(projectHash), '_meta.json');
}

export function sessionPath(projectHash: string, sessionId: string): string {
  return join(sessionDir(projectHash), `${sessionId}.json`);
}

export function geminiCwdPath(sessionId: string): string {
  return join(GEMINI_CWD_DIR, sessionId);
}

export function artifactDir(
  location: 'project' | 'user',
  cwd: string,
  projectHash: string,
): string {
  if (location === 'project') {
    return join(cwd, '.cogair', 'artifacts');
  }
  return join(ARTIFACTS_DIR_USER, projectHash);
}

export function artifactPath(
  location: 'project' | 'user',
  cwd: string,
  projectHash: string,
  sessionId: string,
  turn: number,
): string {
  return join(
    artifactDir(location, cwd, projectHash),
    `${sessionId}-${turn}.md`,
  );
}
