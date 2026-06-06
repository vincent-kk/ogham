import { homedir } from 'node:os';
import { join } from 'node:path';

import { pluginCache } from '@ogham/cross-platform/paths';

export const COGAIR_HOME = pluginCache('cogair');

// agy's GLOBAL MCP server registry (outside COGAIR_HOME). agy loads MCP servers
// from here even in headless `-p` mode, so cogair provisions a youtube-transcript
// server into it when antigravity YouTube support is enabled via /setup. Path
// mirrors the Antigravity CLI layout on both POSIX and Windows (homedir-based).
export const AGY_MCP_CONFIG_PATH = join(
  homedir(),
  '.gemini',
  'antigravity-cli',
  'mcp_config.json',
);

export const CONFIG_PATH = join(COGAIR_HOME, 'config.json');
export const SESSIONS_DIR = join(COGAIR_HOME, 'sessions');
export const RUNTIME_DIR = join(COGAIR_HOME, 'runtime');
export const COUNTER_PATH = join(RUNTIME_DIR, 'counter.json');
export const SETTINGS_SERVER_PATH = join(RUNTIME_DIR, 'settings_server.json');
export const GEMINI_CWD_DIR = join(RUNTIME_DIR, 'gemini-cwd');
export const ANTIGRAVITY_CWD_DIR = join(RUNTIME_DIR, 'antigravity-cwd');
export const AGY_MODELS_CACHE_PATH = join(RUNTIME_DIR, 'agy-models.json');
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

export function antigravityCwdPath(sessionId: string): string {
  return join(ANTIGRAVITY_CWD_DIR, sessionId);
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
