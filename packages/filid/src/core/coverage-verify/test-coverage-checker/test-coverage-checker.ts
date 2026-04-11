/**
 * @file test-coverage-checker.ts
 * @description 사용처별 대표 테스트 존재 여부를 검증하는 모듈.
 *
 * 3-Strategy 테스트 발견 (우선순위 순):
 * 1. Co-located: <dir>/<name>.test.ts (또는 .spec.ts)
 * 2. Mirror:     src/<layer>/<name>.ts → src/__tests__/unit/<layer>/<name>.test.ts
 * 3. Integration: src/__tests__/integration/<name>*.test.ts
 *
 * 각 전략의 구현은 `./strategies/` 조직(organ)에 분리되어 있다.
 */
import type { UsageCoverage, UsageSite } from '../../../types/coverage.js';

import { findColocatedTest } from './strategies/find-colocated-test.js';
import { findIntegrationTest } from './strategies/find-integration-test.js';
import { findMirrorTest } from './strategies/find-mirror-test.js';

/**
 * For each usage site, check if a representative test file exists.
 *
 * Strategies are tried in priority order (co-located → mirror → integration)
 * and the first success wins.
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
      findIntegrationTest(site.filePath, projectRoot);

    if (found) {
      results.push({
        usageSite: site,
        hasTest: true,
        testFilePath: found.testFilePath,
        testCount: found.testCount,
      });
    } else {
      results.push({
        usageSite: site,
        hasTest: false,
        testFilePath: null,
        testCount: 0,
      });
    }
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
