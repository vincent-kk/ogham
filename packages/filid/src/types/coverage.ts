/**
 * @file coverage.ts
 * @description LCA 기반 테스트 커버리지 검증 시스템의 데이터 모델 정의.
 */

/** A single usage site of a shared function */
export interface UsageSite {
  /** Absolute path of the file importing the function */
  filePath: string;
  /** Fractal node path containing this file */
  fractalPath: string;
  /** Import specifiers used (e.g., ['findLCA', 'getModulePlacement']) */
  importedNames: string[];
  /** Whether the import is type-only */
  isTypeOnly: boolean;
  /** Line number of the import statement */
  importLine: number;
}

/** Test coverage status for a single usage site */
export interface UsageCoverage {
  /** The usage site being checked */
  usageSite: UsageSite;
  /** Whether at least one representative test exists */
  hasTest: boolean;
  /** Path to the test file (if found) */
  testFilePath: string | null;
  /** Number of test cases in the test file (0 if no test) */
  testCount: number;
}

/** Result of coverage verification */
export interface CoverageVerifyResult {
  /** The shared function/module being tracked */
  targetPath: string;
  /** Names of exported functions being tracked */
  targetExports: string[];
  /** All usage sites found in the subtree */
  usages: UsageCoverage[];
  /** Count of usage sites with tests */
  coveredCount: number;
  /** Count of usage sites without tests */
  uncoveredCount: number;
  /** Coverage ratio (0.0 - 1.0) */
  coverageRatio: number;
  /** Human-readable warnings for uncovered sites */
  warnings: string[];
}
