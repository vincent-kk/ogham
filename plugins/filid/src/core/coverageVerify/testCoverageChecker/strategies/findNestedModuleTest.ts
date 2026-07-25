/**
 * @file findNestedModuleTest.ts
 * @description Strategy 3: 모듈 디렉터리 또는 소유 fractal 안의 `__tests__/` 레이아웃 탐색.
 *
 * 소스 파일 디렉터리부터 가장 가까운 INTENT.md 디렉터리(그 디렉터리는 포함)까지
 * 올라가 각 수준의 비재귀 `__tests__/`를 검사한다. 이 경계 밖, 특히 상위 `src`
 * 루트의 테스트까지 확장하지 않아 무관한 중앙 테스트가 모든 하위 모듈을 대표하지
 * 않게 한다. 정확한 모듈명 테스트를 우선하고, 행동명 테스트는 해당 fractal의 대표
 * 테스트로 인정하되 모두 `tryTestFile`의 실제 테스트 케이스 검증을 통과해야 한다.
 */
import { existsSync, readdirSync } from 'node:fs';

import { portableDirname, portableJoin } from '@ogham/cross-platform/paths';

import { INTENT_MD } from '../../../../constants/documentFiles.js';

import { moduleName } from './moduleName.js';
import { nearestSrcRoot } from './nearestSrcRoot.js';
import { tryTestFile } from './tryTestFile.js';

const TEST_FILE_RE = /\.(test|spec)\.tsx?$/;

/**
 * Strategy 3: Nested module test directory.
 *
 * Searches each `<level>/__tests__/` from the module directory through its
 * nearest enclosing fractal boundary, preferring an exact module-name match.
 */
export function findNestedModuleTest(
  sourceFilePath: string,
): { testFilePath: string; testCount: number } | null {
  const srcRoot = nearestSrcRoot(sourceFilePath);
  if (!srcRoot) return null;

  const name = moduleName(sourceFilePath);
  let dir = portableDirname(sourceFilePath);

  try {
    while (dir.length >= srcRoot.length) {
      const testsDir = portableJoin(dir, '__tests__');
      let entries: string[] = [];
      try {
        entries = readdirSync(testsDir, { encoding: 'utf-8' }) as string[];
      } catch {
        entries = [];
      }

      const exactCandidates = [
        `${name}.test.ts`,
        `${name}.spec.ts`,
        `${name}.test.tsx`,
        `${name}.spec.tsx`,
      ];
      for (const candidate of exactCandidates) {
        const found = tryTestFile(portableJoin(testsDir, candidate));
        if (found) return found;
      }

      for (const entry of entries
        .filter((entry) => TEST_FILE_RE.test(entry))
        .sort()) {
        if (exactCandidates.includes(entry)) continue;
        const found = tryTestFile(portableJoin(testsDir, entry));
        if (found) return found;
      }

      if (existsSync(portableJoin(dir, INTENT_MD))) return null;
      const parent = portableDirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  } catch {
    return null;
  }

  return null;
}
