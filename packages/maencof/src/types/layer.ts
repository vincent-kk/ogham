/**
 * @file layer.ts
 * @description Layer 경로 유틸리티 — 모든 레이어(hooks, mcp, core)에서 의존 가능
 */

/** Layer 1 디렉토리 접두사 */
export const LAYER1_PREFIX = '01_Core';

/**
 * 파일 경로가 Layer 1 (01_Core/) 내에 있는지 확인한다.
 */
export function isLayer1Path(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return (
    normalized.includes(`/${LAYER1_PREFIX}/`) ||
    normalized.startsWith(`${LAYER1_PREFIX}/`) ||
    normalized === LAYER1_PREFIX
  );
}
