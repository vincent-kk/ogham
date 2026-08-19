/**
 * @file layer.ts
 * @description Layer 경로 유틸리티 — 모든 레이어(hooks, mcp, core)에서 의존 가능.
 * 상수 LAYER1_PREFIX 는 constants/directories.ts 의 단일 출처에서 import 한다.
 */
import { posix } from 'node:path';

import { normalize } from '@ogham/cross-platform';

import { LAYER_DIR } from '../constants/architecture.js';
import { LAYER1_PREFIX } from '../constants/directories.js';

/**
 * 파일 경로가 Layer 1 (01_Core/) 내에 있는지 확인한다.
 */
export function isLayer1Path(filePath: string): boolean {
  const normalized = normalize(filePath);
  return (
    normalized.includes(`/${LAYER1_PREFIX}/`) ||
    normalized.startsWith(`${LAYER1_PREFIX}/`) ||
    normalized === LAYER1_PREFIX
  );
}

/** 레이어 디렉토리 이름 집합 (경로 첫 세그먼트 게이트용) */
const LAYER_DIR_NAMES: ReadonlySet<string> = new Set(Object.values(LAYER_DIR));

/**
 * vault 상대 경로의 정규화된 첫 세그먼트가 레이어 디렉토리(01_Core~05_Context)인지
 * 판정한다. 그래프 노드 자격의 경로 조건 — 서고(99_Archive)·vault 루트 문서·미지의
 * 디렉토리·절대경로·상향 탈출(`..`) 경로는 false. 대소문자는 구분한다 — 디렉토리
 * 실명과 불일치하는 경로는 스캔 allowlist 도 놓치므로 게이트도 같은 기준을 쓴다.
 */
export function isLayerDirPath(relativePath: string): boolean {
  const canonical = posix.normalize(normalize(relativePath));
  if (canonical.startsWith('/') || canonical.startsWith('..')) return false;
  const first = canonical.split('/')[0] ?? '';
  return LAYER_DIR_NAMES.has(first);
}
