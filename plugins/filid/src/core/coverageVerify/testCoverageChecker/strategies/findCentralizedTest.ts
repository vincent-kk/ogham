/**
 * @file findCentralizedTest.ts
 * @description Strategy 3: 중앙집중 테스트 레이아웃(`src/__tests__/**`) 탐색.
 *
 * 이 레이아웃은 테스트를 소스 경로 미러가 아니라 평탄화된 이름으로 보관한다
 * (`__tests__/unit/hooks/shared.test.ts` 가 `hooks/shared/utils/*.ts` 전부를
 * 검증). 파일 basename 정확 일치를 먼저 시도하고, 없으면 소유 fractal
 * (가장 가까운 INTENT.md 디렉터리) 이름 prefix 로 매칭한다 — fractal 단위
 * 대표 테스트를 인정하는 의도적 완화이며, `tryTestFile` 의 테스트 케이스
 * 존재 검증(`total > 0`)을 통과해야만 채택된다.
 */
import { existsSync, readdirSync } from 'node:fs';

import {
  portableBasename,
  portableDirname,
  portableJoin,
} from '@ogham/cross-platform/paths';

import { INTENT_MD } from '../../../../constants/documentFiles.js';

import { moduleName } from './moduleName.js';
import { nearestSrcRoot } from './nearestSrcRoot.js';
import { tryTestFile } from './tryTestFile.js';

const TEST_FILE_RE = /\.(test|spec)\.tsx?$/;

function nearestFractalName(
  sourceFilePath: string,
  srcRoot: string,
): string | null {
  let dir = portableDirname(sourceFilePath);
  while (dir.length >= srcRoot.length) {
    if (existsSync(portableJoin(dir, INTENT_MD))) return portableBasename(dir);
    const parent = portableDirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Strategy 3: Centralized flattened test layout.
 *
 * Search `<nearest src>/__tests__/**` for `<basename>.{test,spec}.{ts,tsx}`
 * (exact), then `<fractalName>*.{test,spec}.{ts,tsx}` (prefix).
 */
export function findCentralizedTest(
  sourceFilePath: string,
): { testFilePath: string; testCount: number } | null {
  const srcRoot = nearestSrcRoot(sourceFilePath);
  if (!srcRoot) return null;

  const testsRoot = portableJoin(srcRoot, '__tests__');
  let entries: string[];
  try {
    entries = readdirSync(testsRoot, {
      recursive: true,
      encoding: 'utf-8',
    }) as string[];
  } catch {
    return null;
  }

  const testFiles = entries.filter((e) => TEST_FILE_RE.test(e)).sort();

  const firstMatch = (
    name: string,
    prefix: boolean,
  ): { testFilePath: string; testCount: number } | null => {
    for (const rel of testFiles) {
      const base = portableBasename(rel).replace(TEST_FILE_RE, '');
      if (prefix ? base.startsWith(name) : base === name) {
        const found = tryTestFile(portableJoin(testsRoot, rel));
        if (found) return found;
      }
    }
    return null;
  };

  const base = moduleName(sourceFilePath);
  const exact = firstMatch(base, false);
  if (exact) return exact;

  const fractalName = nearestFractalName(sourceFilePath, srcRoot);
  if (fractalName && fractalName !== base) return firstMatch(fractalName, true);

  return null;
}
