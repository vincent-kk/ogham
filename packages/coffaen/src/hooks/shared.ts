/**
 * @file shared.ts
 * @description coffaen hook 공통 유틸리티 — vault 경로 확인, 메타 경로 헬퍼
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** coffaen 메타 디렉토리 이름 */
export const COFFAEN_META_DIR = '.coffaen-meta';
/** coffaen 인덱스 디렉토리 이름 */
export const COFFAEN_DIR = '.coffaen';
// isLayer1Path, LAYER1_PREFIX: types/layer.ts로 이동 — 하위 호환을 위해 re-export
export { LAYER1_PREFIX, isLayer1Path } from '../types/layer.js';

/**
 * 현재 작업 디렉토리가 coffaen vault인지 확인한다.
 * .coffaen/ 또는 .coffaen-meta/ 디렉토리 존재 여부로 판단.
 */
export function isCoffaenVault(cwd: string): boolean {
  return (
    existsSync(join(cwd, COFFAEN_DIR)) ||
    existsSync(join(cwd, COFFAEN_META_DIR))
  );
}

/**
 * coffaen 메타 파일 경로를 반환한다.
 */
export function metaPath(cwd: string, ...segments: string[]): string {
  return join(cwd, COFFAEN_META_DIR, ...segments);
}

/**
 * coffaen 인덱스 파일 경로를 반환한다.
 */
export function coffaenPath(cwd: string, ...segments: string[]): string {
  return join(cwd, COFFAEN_DIR, ...segments);
}

/**
 * stdin으로부터 JSON 입력을 읽는다.
 */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * hook 결과를 stdout에 출력한다.
 */
export function writeResult(result: unknown): void {
  process.stdout.write(JSON.stringify(result));
}

/**
 * coffaen MCP 도구 이름 집합.
 * SYNC: hooks/hooks.json PostToolUse.matcher와 동기화 필수
 *
 * Excluded tools: coffaen_read, kg_search, kg_navigate, kg_context, kg_status have no
 * write side effects. kg_build writes to .coffaen/ (index rebuild) but is excluded because
 * it clears stale-nodes on completion — tracking it here would be contradictory.
 * hooks.json PostToolUse.matcher must contain the same set.
 */
export const COFFAEN_MCP_TOOLS = new Set([
  'coffaen_create',
  'coffaen_update',
  'coffaen_delete',
  'coffaen_move',
]);
