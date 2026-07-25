/**
 * @file testCoverageChecker.ts
 * @description 사용처별 대표 테스트 존재 여부를 검증하는 모듈.
 *
 * 5-Strategy 테스트 발견 (우선순위 순, 앵커는 소스 파일의 nearest `src`):
 * 1. Co-located:  <dir>/<name>.test.ts (또는 .spec.ts)
 * 2. Mirror:      <src>/<layer>/<name>.ts → <src>/__tests__/unit/<layer>/<name>.test.ts
 * 3. Nested:      <module~fractal>/__tests__/ 의 exact name → behavior name
 * 4. Centralized: <src>/__tests__/** 에서 basename 정확 일치 → 소유 fractal 이름 prefix
 * 5. Integration: <src>/__tests__/integration/<name>*.test.ts
 *
 * Nested는 모듈의 소유 fractal에 고정돼 centralized보다 더 구체적이므로 먼저
 * 시도한다. 그래야 src 전역의 평탄화 테스트보다 가까운 행동 테스트가 대표한다.
 *
 * 각 전략의 구현은 `./strategies/` 조직(organ)에 분리되어 있다.
 */
import type { UsageCoverage, UsageSite } from '../../../types/coverage.js';

import { findCentralizedTest } from './strategies/findCentralizedTest.js';
import { findColocatedTest } from './strategies/findColocatedTest.js';
import { findIntegrationTest } from './strategies/findIntegrationTest.js';
import { findMirrorTest } from './strategies/findMirrorTest.js';
import { findNestedModuleTest } from './strategies/findNestedModuleTest.js';

/**
 * For each usage site, check if a representative test file exists.
 *
 * Strategies are tried in priority order
 * (co-located → mirror → nested → centralized → integration); first success wins.
 *
 * @param usageSites - Array of UsageSite from findSubtreeUsages
 * @param projectRoot - Absolute path to project root
 * @returns Array of UsageCoverage with test existence info
 */
export async function checkTestCoverage(
  usageSites: UsageSite[],
  projectRoot: string,
): Promise<UsageCoverage[]> {
  const results: UsageCoverage[] = [];

  for (const site of usageSites) {
    const found =
      findColocatedTest(site.filePath) ??
      findMirrorTest(site.filePath, projectRoot) ??
      findNestedModuleTest(site.filePath) ??
      findCentralizedTest(site.filePath) ??
      findIntegrationTest(site.filePath, projectRoot);

    if (found)
      results.push({
        usageSite: site,
        hasTest: true,
        testFilePath: found.testFilePath,
        testCount: found.testCount,
      });
    else
      results.push({
        usageSite: site,
        hasTest: false,
        testFilePath: null,
        testCount: 0,
      });
  }

  return results;
}

/**
 * Generate human-readable warnings for uncovered usage sites.
 *
 * @param coverageResults - Array of UsageCoverage
 * @returns Warning strings for each uncovered site
 */
export function generateCoverageWarnings(
  coverageResults: UsageCoverage[],
): string[] {
  const warnings: string[] = [];

  for (const result of coverageResults) {
    if (result.hasTest) continue;

    const { filePath, importedNames } = result.usageSite;
    const names =
      importedNames.length > 0 ? importedNames.join(', ') : '(default)';
    warnings.push(
      `UNCOVERED: ${filePath} imports [${names}] but has no representative test`,
    );
  }

  return warnings;
}
