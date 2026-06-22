import { homedir } from "node:os";
import { join } from "node:path";

function claudeRoot(): string {
  return process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
}

export const DEILEN_HOME = join(claudeRoot(), "plugins", "deilen");
export const CONFIG_PATH = join(DEILEN_HOME, "config.json");
export const RUNTIME_DIR = join(DEILEN_HOME, "runtime");
export const SERVER_STATE_PATH = join(RUNTIME_DIR, "server.json");
export const SESSIONS_DIR = join(RUNTIME_DIR, "sessions");

export function sessionDir(sessionId: string): string {
  return join(SESSIONS_DIR, sessionId);
}

export function sessionMetaPath(sessionId: string): string {
  return join(sessionDir(sessionId), "meta.json");
}

export function sessionReportPath(sessionId: string): string {
  return join(sessionDir(sessionId), "report.md");
}

export function sessionFeedbackPath(sessionId: string): string {
  return join(sessionDir(sessionId), "feedback.json");
}

export function sessionImagesDir(sessionId: string): string {
  return join(sessionDir(sessionId), "images");
}

export function sessionImagePath(sessionId: string, fileName: string): string {
  return join(sessionImagesDir(sessionId), fileName);
}
