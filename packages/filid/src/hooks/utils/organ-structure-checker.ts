import { existsSync, readdirSync } from 'node:fs';
import * as path from 'node:path';

import {
  KNOWN_ORGAN_DIR_NAMES,
  classifyNode,
} from '../../core/tree/organ-classifier/organ-classifier.js';

/**
 * No-op cache clear. Historically this invalidated a module-level Map cache,
 * but hook bridge scripts spawn a fresh Node process per invocation — the
 * cache was always empty at module load, providing no benefit. The function
 * is kept as a stable export for any callers still referencing it.
 */
export function clearOrganCache(): void {
  /* intentional no-op — classifier is stateless */
}

/**
 * 디렉토리 경로를 기반으로 organ 여부를 판별.
 * classifyNode()를 사용하여 구조 기반 분류를 수행하고,
 * 파일시스템 접근 실패 시 false를 반환한다.
 *
 * Performance: Uses readdirSync for the target dir and each child dir.
 * For a directory with N subdirs, this makes N+1 sync filesystem calls.
 * Acceptable for hook usage where directories are few; for large trees,
 * prefer fractal_scan MCP tool results instead.
 */
export function isOrganByStructure(dirPath: string): boolean {
  try {
    if (!existsSync(dirPath)) {
      // 파일시스템에 없으면 레거시 이름 기반 폴백
      return KNOWN_ORGAN_DIR_NAMES.includes(path.basename(dirPath));
    }
    const entries = readdirSync(dirPath, { withFileTypes: true });
    const hasIntentMd = entries.some(
      (e) => e.isFile() && e.name === 'INTENT.md',
    );
    const hasDetailMd = entries.some(
      (e) => e.isFile() && e.name === 'DETAIL.md',
    );
    const subDirs = entries.filter((e) => e.isDirectory());
    const hasFractalChildren = subDirs.some((d) => {
      const childPath = path.join(dirPath, d.name);
      try {
        const childEntries = readdirSync(childPath, { withFileTypes: true });
        return childEntries.some(
          (ce) =>
            ce.isFile() && (ce.name === 'INTENT.md' || ce.name === 'DETAIL.md'),
        );
      } catch {
        return false;
      }
    });
    const isLeafDirectory = subDirs.length === 0;
    const category = classifyNode({
      dirName: path.basename(dirPath),
      hasIntentMd,
      hasDetailMd,
      hasFractalChildren,
      isLeafDirectory,
    });
    return category === 'organ';
  } catch {
    return false;
  }
}
