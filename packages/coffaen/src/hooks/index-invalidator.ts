/**
 * @file index-invalidator.ts
 * @description PostToolUse Hook — coffaen MCP 도구 호출 후 stale-nodes.json 업데이트 + 사용 통계 증가
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { isCoffaenVault, metaPath, COFFAEN_MCP_TOOLS } from './shared.js';

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
    null;

  // stale-nodes.json 업데이트
  if (affectedPath) {
    appendStaleNode(cwd, affectedPath);
  }

  // 참고: coffaen_move의 대상 경로 stale 추적은 coffaen-move.ts 핸들러(123-127줄)에서
  // mcp/shared.ts의 appendStaleNode()를 직접 호출하므로 이 훅에서 중복 처리하지 않는다.
  // 두 appendStaleNode 함수는 서로 다른 모듈의 별개 함수:
  //   - hooks/index-invalidator.ts (동기, .coffaen-meta/stale-nodes.json)
  //   - mcp/shared.ts (비동기, .coffaen/stale-nodes.json)

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
