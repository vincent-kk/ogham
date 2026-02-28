/**
 * @file index-invalidator.ts
 * @description PostToolUse Hook — coffaen MCP 도구 호출 후 stale-nodes.json 업데이트 + 사용 통계 증가
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { isCoffaenVault, metaPath } from './shared.js';

export interface PostToolUseInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
  cwd?: string;
}

export interface PostToolUseResult {
  continue: boolean;
}

/** coffaen MCP 도구 이름 집합 */
const COFFAEN_MCP_TOOLS = new Set([
  'coffaen_create',
  'coffaen_update',
  'coffaen_delete',
  'coffaen_move',
]);

/**
 * Index Invalidator Hook 핸들러.
 * coffaen CRUD 도구 호출 후:
 * 1. 영향받은 노드를 stale-nodes.json에 추가
 * 2. usage-stats.json 사용 통계 카운트 증가
 */
export function runIndexInvalidator(input: PostToolUseInput): PostToolUseResult {
  const cwd = input.cwd ?? process.cwd();
  const toolName = input.tool_name ?? '';

  if (!isCoffaenVault(cwd) || !COFFAEN_MCP_TOOLS.has(toolName)) {
    return { continue: true };
  }

  // 영향받은 노드 경로 추출
  const affectedPath =
    (input.tool_input?.path as string) ??
    (input.tool_input?.file_path as string) ??
    (input.tool_input?.from_path as string) ??
    null;

  // stale-nodes.json 업데이트
  if (affectedPath) {
    appendStaleNode(cwd, affectedPath);
  }

  // 이동 시 대상 경로도 추가
  if (toolName === 'coffaen_move') {
    const toPath = input.tool_input?.to_path as string | undefined;
    if (toPath) {
      appendStaleNode(cwd, toPath);
    }
  }

  // usage-stats.json 카운트 증가
  incrementUsageStat(cwd, toolName);

  return { continue: true };
}

/**
 * stale-nodes.json에 노드 경로를 추가한다 (중복 제거).
 */
function appendStaleNode(cwd: string, nodePath: string): void {
  const stalePath = metaPath(cwd, 'stale-nodes.json');
  let staleNodes: string[] = [];

  if (existsSync(stalePath)) {
    try {
      staleNodes = JSON.parse(readFileSync(stalePath, 'utf-8')) as string[];
    } catch {
      staleNodes = [];
    }
  }

  if (!staleNodes.includes(nodePath)) {
    staleNodes.push(nodePath);
    ensureDir(stalePath);
    writeFileSync(stalePath, JSON.stringify(staleNodes, null, 2), 'utf-8');
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
      stats = JSON.parse(readFileSync(statsPath, 'utf-8')) as Record<string, number>;
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
