/**
 * @file shared.ts
 * @description maencof hook 공통 유틸리티 — vault 경로 확인, 메타 경로 헬퍼
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** maencof 메타 디렉토리 이름 */
export const MAENCOF_META_DIR = '.maencof-meta';
/** maencof 인덱스 디렉토리 이름 */
export const MAENCOF_DIR = '.maencof';
// isLayer1Path, LAYER1_PREFIX: types/layer.ts로 이동 — 하위 호환을 위해 re-export
export { LAYER1_PREFIX, isLayer1Path } from '../types/layer.js';

/**
 * 현재 작업 디렉토리가 maencof vault인지 확인한다.
 * .maencof/ 또는 .maencof-meta/ 디렉토리 존재 여부로 판단.
 */
export function isMaencofVault(cwd: string): boolean {
  return (
    existsSync(join(cwd, MAENCOF_DIR)) ||
    existsSync(join(cwd, MAENCOF_META_DIR))
  );
}

/**
 * maencof 메타 파일 경로를 반환한다.
 */
export function metaPath(cwd: string, ...segments: string[]): string {
  return join(cwd, MAENCOF_META_DIR, ...segments);
}

/**
 * maencof 인덱스 파일 경로를 반환한다.
 */
export function maencofPath(cwd: string, ...segments: string[]): string {
  return join(cwd, MAENCOF_DIR, ...segments);
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
 * maencof MCP 도구 이름 집합.
 * SYNC: hooks/hooks.json PostToolUse.matcher와 동기화 필수
 *
 * Excluded tools: maencof_read, kg_search, kg_navigate, kg_context, kg_status have no
 * write side effects. kg_build writes to .maencof/ (index rebuild) but is excluded because
 * it clears stale-nodes on completion — tracking it here would be contradictory.
 * hooks.json PostToolUse.matcher must contain the same set.
 */
export const MAENCOF_MCP_TOOLS = new Set([
  'maencof_create',
  'maencof_update',
  'maencof_delete',
  'maencof_move',
]);
