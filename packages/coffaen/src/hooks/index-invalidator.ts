/**
 * @file index-invalidator.ts
 * @description PostToolUse Hook — coffaen MCP 도구 호출 후 stale-nodes.json 업데이트 + 사용 통계 증가
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import {
  COFFAEN_MCP_TOOLS,
  coffaenPath,
  isCoffaenVault,
  metaPath,
} from './shared.js';

export interface PostToolUseInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
  cwd?: string;
}

export interface PostToolUseResult {
  continue: boolean;
}

/**
 * Index Invalidator Hook 핸들러.
 * coffaen CRUD 도구 호출 후:
 * 1. 영향받은 노드를 stale-nodes.json에 추가
 * 2. usage-stats.json 사용 통계 카운트 증가
 */
export function runIndexInvalidator(
  input: PostToolUseInput,
): PostToolUseResult {
  const cwd = input.cwd ?? process.cwd();
  const toolName = input.tool_name ?? '';

  if (!isCoffaenVault(cwd) || !COFFAEN_MCP_TOOLS.has(toolName)) {
    return { continue: true };
  }

  // 영향받은 노드 경로 추출
  const affectedPath =
    (input.tool_input?.path as string) ??
    (input.tool_input?.file_path as string) ??
    null;

  // stale-nodes.json 업데이트
  if (affectedPath) {
    appendStaleNode(cwd, affectedPath);
  }

  // Note: coffaen_move target path stale tracking is handled by coffaen-move.ts handler
  // via mcp/shared.ts appendStaleNode(), so this hook does not duplicate it.
  // Both writers now target the same file: .coffaen/stale-nodes.json with StaleNodes format.

  // usage-stats.json 카운트 증가
  incrementUsageStat(cwd, toolName);

  return { continue: true };
}

/**
 * Append a node path to .coffaen/stale-nodes.json (deduplicated).
 * Uses StaleNodes format { paths: string[], updatedAt: string } matching MetadataStore.
 */
function appendStaleNode(cwd: string, nodePath: string): void {
  const stalePath = coffaenPath(cwd, 'stale-nodes.json');
  let stale: { paths: string[]; updatedAt: string } = {
    paths: [],
    updatedAt: new Date().toISOString(),
  };

  if (existsSync(stalePath)) {
    try {
      stale = JSON.parse(readFileSync(stalePath, 'utf-8')) as typeof stale;
    } catch {
      stale = { paths: [], updatedAt: new Date().toISOString() };
    }
  }

  if (!stale.paths.includes(nodePath)) {
    stale.paths.push(nodePath);
    stale.updatedAt = new Date().toISOString();
    ensureDir(stalePath);
    writeFileSync(stalePath, JSON.stringify(stale, null, 2), 'utf-8');
  }
}

/**
 * usage-stats.json의 도구별 호출 카운트를 증가한다.
 */
function incrementUsageStat(cwd: string, toolName: string): void {
  const statsPath = metaPath(cwd, 'usage-stats.json');
  let stats: Record<string, number> = {};

  if (existsSync(statsPath)) {
    try {
      stats = JSON.parse(readFileSync(statsPath, 'utf-8')) as Record<
        string,
        number
      >;
    } catch {
      stats = {};
    }
  }

  stats[toolName] = (stats[toolName] ?? 0) + 1;
  ensureDir(statsPath);
  writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf-8');
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
