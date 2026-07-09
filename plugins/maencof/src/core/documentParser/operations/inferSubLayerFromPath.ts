/**
 * @file inferSubLayerFromPath.ts
 * @description 파일 경로에서 서브레이어를 추론한다.
 * e.g. '03_External/relational/alice.md' → 'relational'
 *      '05_Context/buffer/inbox.md' → 'buffer'
 *      '03_External/react-hooks.md' → undefined
 */
import { SUBLAYER_DIR_PATTERNS } from '../../../constants/documentParser.js';
import type { SubLayer } from '../../../types/common.js';

// SUBLAYER_DIR_PATTERNS — constants/documentParser.ts (단일 출처).

export function inferSubLayerFromPath(
  relativePath: string,
): SubLayer | undefined {
  for (const [prefix, subLayer] of Object.entries(SUBLAYER_DIR_PATTERNS))
    if (relativePath.startsWith(`${prefix}/`)) return subLayer;

  return undefined;
}
