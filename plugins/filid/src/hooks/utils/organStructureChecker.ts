import { existsSync, readdirSync } from 'node:fs';
import * as path from 'node:path';

import { DETAIL_MD, INTENT_MD } from '../../constants/documentFiles.js';
import {
  KNOWN_ORGAN_DIR_NAMES,
  classifyNode,
  isInfraOrgDirectoryByPattern,
} from '../../core/tree/organClassifier/organClassifier.js';

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
 * 이 디렉토리가 **선언된** organ 인지 판별한다 — known organ name 이거나
 * `__name__` / `.name` infra 패턴인 경우.
 *
 * 구조 기본값(`classifyNode` 8단계)으로 organ 이 된 디렉토리는 여기서 false 다.
 * 1.0 에서 분류 기본값이 `fractal` 에서 `organ` 으로 바뀌면서, 선언 없는 모든
 * 디렉토리가 organ 이 되었다. 훅 가드가 그 기본값까지 organ 으로 보면
 * `.filid/review/<branch>/` 같은 정상 경로마다 flatness 경고가 붙는다.
 * 가드가 말하려는 것은 "이름으로 선언된 compartment 를 flat 하게 두라"이지
 * "아직 계약을 선언하지 않은 디렉토리를 flat 하게 두라"가 아니다.
 *
 * 문서가 있으면 여전히 fractal 이다 — `utils/` 라도 INTENT.md 가 있으면 false.
 *
 * Performance: Uses readdirSync for the target dir and each child dir.
 * For a directory with N subdirs, this makes N+1 sync filesystem calls.
 * Acceptable for hook usage where directories are few; for large trees,
 * prefer fractal_scan MCP tool results instead.
 */
export function isOrganByStructure(dirPath: string): boolean {
  try {
    const dirName = path.basename(dirPath);
    const isDeclaredOrgan =
      KNOWN_ORGAN_DIR_NAMES.includes(dirName) ||
      isInfraOrgDirectoryByPattern(dirName);
    if (!isDeclaredOrgan) return false;

    if (!existsSync(dirPath))
      // 파일시스템에 없으면 이름 기반 판정으로 확정
      return true;

    const entries = readdirSync(dirPath, { withFileTypes: true });
    const hasIntentMd = entries.some((e) => e.isFile() && e.name === INTENT_MD);
    const hasDetailMd = entries.some((e) => e.isFile() && e.name === DETAIL_MD);
    const subDirs = entries.filter((e) => e.isDirectory());
    const hasFractalChildren = subDirs.some((d) => {
      const childPath = path.join(dirPath, d.name);
      try {
        const childEntries = readdirSync(childPath, { withFileTypes: true });
        return childEntries.some(
          (ce) =>
            ce.isFile() && (ce.name === INTENT_MD || ce.name === DETAIL_MD),
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
