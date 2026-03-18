/**
 * @file test-coverage-checker.ts
 * @description 사용처별 대표 테스트 존재 여부를 검증하는 모듈.
 *
 * 3-Strategy 테스트 발견:
 * 1. Co-located: <dir>/<name>.test.ts (또는 .spec.ts) — 소스 파일 옆
 * 2. Mirror: src/<layer>/<name>.ts → src/__tests__/unit/<layer>/<name>.test.ts
 * 3. Integration: src/__tests__/integration/<name>*.test.ts (이름 규칙 매칭)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

import {
  type RawTestFile,
  countTestCases,
} from '../../metrics/test-counter.js';
import type { UsageCoverage, UsageSite } from '../../types/coverage.js';

/**
 * Extract the module name (basename without extension) from a file path.
 */
function moduleName(filePath: string): string {
  return basename(filePath).replace(/\.[^.]+$/, '');
}

/**
 * Try to find and validate a test file at the given path.
 * Returns the test count if found and valid, or null otherwise.
 */
function tryTestFile(
  candidatePath: string,
): { testFilePath: string; testCount: number } | null {
  if (!existsSync(candidatePath)) return null;

  let content: string;
  try {
    content = readFileSync(candidatePath, 'utf-8');
  } catch {
    // File exists but is unreadable
    return null;
  }

  const raw: RawTestFile = { filePath: candidatePath, content };
  const result = countTestCases(raw);
  if (result.total === 0) return null;

  return { testFilePath: candidatePath, testCount: result.total };
}

/**
 * Strategy 1: Co-located test file.
 * Looks for <name>.test.ts or <name>.spec.ts next to the source file.
 */
function findColocatedTest(
  sourceFilePath: string,
): { testFilePath: string; testCount: number } | null {
  const dir = dirname(sourceFilePath);
  const name = moduleName(sourceFilePath);

  const candidates = [
    join(dir, `${name}.test.ts`),
    join(dir, `${name}.spec.ts`),
    join(dir, `${name}.test.tsx`),
    join(dir, `${name}.spec.tsx`),
  ];

  for (const candidate of candidates) {
    const found = tryTestFile(candidate);
    if (found) return found;
  }
  return null;
}

/**
 * Strategy 2: Mirror-structure test file.
 * src/<layer>/<name>.ts → src/__tests__/unit/<layer>/<name>.test.ts
 *
 * Algorithm:
 * 1. Compute relative path from projectRoot
 * 2. Strip leading 'src/' prefix
 * 3. Prepend 'src/__tests__/unit/'
 * 4. Replace .ts with .test.ts (and try .spec.ts variant)
 */
function findMirrorTest(
  sourceFilePath: string,
  projectRoot: string,
): { testFilePath: string; testCount: number } | null {
  const rel = relative(projectRoot, sourceFilePath);

  // Must be under src/
  if (!rel.startsWith('src/')) return null;

  // Strip 'src/' and get directory + filename
  const withoutSrc = rel.slice(4); // remove 'src/'
  const ext = sourceFilePath.match(/\.[^.]+$/)?.[0] ?? '.ts';
  const nameWithoutExt = withoutSrc.replace(/\.[^.]+$/, '');

  const candidates = [
    join(projectRoot, 'src', '__tests__', 'unit', `${nameWithoutExt}.test.ts`),
    join(projectRoot, 'src', '__tests__', 'unit', `${nameWithoutExt}.spec.ts`),
    join(
      projectRoot,
      'src',
      '__tests__',
      'unit',
      `${nameWithoutExt}.test${ext}`,
    ),
  ];

  // Deduplicate
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    const found = tryTestFile(candidate);
    if (found) return found;
  }
  return null;
}

/**
 * Strategy 3: Integration test by naming convention.
 * Glob src/__tests__/integration/*.test.ts and match filenames
 * that start with the source module name.
 */
function findIntegrationTest(
  sourceFilePath: string,
  projectRoot: string,
): { testFilePath: string; testCount: number } | null {
  const name = moduleName(sourceFilePath);
  const integrationDir = join(projectRoot, 'src', '__tests__', 'integration');

  let entries: string[];
  try {
    entries = readdirSync(integrationDir);
  } catch {
    // Integration test directory doesn't exist
    return null;
  }

  for (const entry of entries) {
    if (!entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')) continue;

    const entryName = entry.replace(/\.(test|spec)\.ts$/, '');
    // Match: entry name starts with or equals the source module name
    if (entryName === name || entryName.startsWith(`${name}-`)) {
      const candidatePath = join(integrationDir, entry);
      const found = tryTestFile(candidatePath);
      if (found) return found;
    }
  }

  return null;
}

/**
 * For each usage site, check if a representative test file exists.
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
    // Try strategies in priority order
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
