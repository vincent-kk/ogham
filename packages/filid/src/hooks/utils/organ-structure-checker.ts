import { existsSync, readdirSync } from 'node:fs';
import * as path from 'node:path';

import {
  KNOWN_ORGAN_DIR_NAMES,
  classifyNode,
} from '../../core/tree/organ-classifier.js';

/**
 * Per-invocation cache for isOrganByStructure to avoid redundant readdirSync calls.
 * Lifecycle: module-scope — lives for the duration of the process.
 * In hook mode (bridge scripts), each invocation spawns a fresh process,
 * so this cache is effectively per-invocation.
 * In MCP server / test environments, call clearOrganCache() to invalidate.
 */
const organCache = new Map<string, boolean>();

/** Clear the organ classification cache. Useful in tests or long-lived processes. */
export function clearOrganCache(): void {
  organCache.clear();
}

/**
 * 디렉토리 경로를 기반으로 organ 여부를 판별.
 * classifyNode()를 사용하여 구조 기반 분류를 수행하고,
 * 파일시스템 접근 실패 시 false를 반환한다.
 * 결과는 프로세스 내 캐시에 저장하여 동일 경로 반복 검사를 방지한다.
 *
 * Performance: Uses readdirSync for the target dir and each child dir.
 * For a directory with N subdirs, this makes N+1 sync filesystem calls
 * on the first invocation (subsequent calls are cached via organCache).
 * Acceptable for hook usage where directories are few; for large trees,
 * prefer fractal_scan MCP tool results instead.
 */
export function isOrganByStructure(dirPath: string): boolean {
  const cached = organCache.get(dirPath);
  if (cached !== undefined) return cached;
  try {
    if (!existsSync(dirPath)) {
      // 파일시스템에 없으면 레거시 이름 기반 폴백
      const fallback = KNOWN_ORGAN_DIR_NAMES.includes(path.basename(dirPath));
      organCache.set(dirPath, fallback);
      return fallback;
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
    const result = category === 'organ';
    organCache.set(dirPath, result);
    return result;
  } catch {
    organCache.set(dirPath, false);
    return false;
  }
}
