import { existsSync, readFileSync, readdirSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkTestCoverage,
  generateCoverageWarnings,
} from '../../../core/coverage/test-coverage-checker/test-coverage-checker.js';
import type { UsageSite } from '../../../types/coverage.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ''),
  readdirSync: vi.fn(() => []),
}));

vi.mock('../../../metrics/test-counter/test-counter.js', () => ({
  countTestCases: vi.fn(() => ({
    filePath: '',
    fileType: 'test',
    total: 0,
    basic: 0,
    complex: 0,
  })),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockReaddirSync = vi.mocked(readdirSync);

const { countTestCases } = await import('../../../metrics/test-counter/test-counter.js');
const mockCountTestCases = vi.mocked(countTestCases);

function makeSite(overrides: Partial<UsageSite> = {}): UsageSite {
  return {
    filePath: '/project/src/core/consumer.ts',
    fractalPath: '/project/src/core',
    importedNames: ['foo'],
    isTypeOnly: false,
    importLine: 1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockExistsSync.mockReturnValue(false);
  mockReadFileSync.mockReturnValue('');
  mockReaddirSync.mockReturnValue([]);
  mockCountTestCases.mockReturnValue({
    filePath: '',
    fileType: 'test',
    total: 0,
    basic: 0,
    complex: 0,
  });
});

describe('checkTestCoverage', () => {
  // === Core tests (3) ===

  it('finds co-located test file (Strategy 1)', async () => {
    const site = makeSite();

    mockExistsSync.mockImplementation(
      (p) => p === '/project/src/core/consumer.test.ts',
    );
    mockReadFileSync.mockReturnValue('it("works", () => {});');
    mockCountTestCases.mockReturnValue({
      filePath: '/project/src/core/consumer.test.ts',
      fileType: 'test',
      total: 1,
      basic: 1,
      complex: 0,
    });

    const results = await checkTestCoverage([site], '/project');

    expect(results).toHaveLength(1);
    expect(results[0].hasTest).toBe(true);
    expect(results[0].testFilePath).toBe('/project/src/core/consumer.test.ts');
    expect(results[0].testCount).toBe(1);
  });

  it('finds mirror-structure test file (Strategy 2)', async () => {
    const site = makeSite();

    mockExistsSync.mockImplementation(
      (p) => p === '/project/src/__tests__/unit/core/consumer.test.ts',
    );
    mockReadFileSync.mockReturnValue('it("a", () => {}); it("b", () => {});');
    mockCountTestCases.mockReturnValue({
      filePath: '/project/src/__tests__/unit/core/consumer.test.ts',
      fileType: 'test',
      total: 2,
      basic: 2,
      complex: 0,
    });

    const results = await checkTestCoverage([site], '/project');

    expect(results).toHaveLength(1);
    expect(results[0].hasTest).toBe(true);
    expect(results[0].testFilePath).toBe(
      '/project/src/__tests__/unit/core/consumer.test.ts',
    );
    expect(results[0].testCount).toBe(2);
  });

  it('returns hasTest: false when no test found', async () => {
    const site = makeSite();

    const results = await checkTestCoverage([site], '/project');

    expect(results).toHaveLength(1);
    expect(results[0].hasTest).toBe(false);
    expect(results[0].testFilePath).toBeNull();
    expect(results[0].testCount).toBe(0);
  });

  // === Edge case tests ===

  it('finds .spec.ts co-located variant', async () => {
    const site = makeSite();

    mockExistsSync.mockImplementation(
      (p) => p === '/project/src/core/consumer.spec.ts',
    );
    mockReadFileSync.mockReturnValue('it("spec", () => {});');
    mockCountTestCases.mockReturnValue({
      filePath: '/project/src/core/consumer.spec.ts',
      fileType: 'spec',
      total: 1,
      basic: 1,
      complex: 0,
    });

    const results = await checkTestCoverage([site], '/project');

    expect(results[0].hasTest).toBe(true);
    expect(results[0].testFilePath).toBe('/project/src/core/consumer.spec.ts');
  });

  it('returns hasTest: false for empty test file (0 test cases)', async () => {
    const site = makeSite();

    mockExistsSync.mockImplementation(
      (p) => p === '/project/src/core/consumer.test.ts',
    );
    mockReadFileSync.mockReturnValue('// empty test file');
    mockCountTestCases.mockReturnValue({
      filePath: '/project/src/core/consumer.test.ts',
      fileType: 'test',
      total: 0,
      basic: 0,
      complex: 0,
    });

    const results = await checkTestCoverage([site], '/project');

    expect(results[0].hasTest).toBe(false);
  });

  it('returns hasTest: false when readFileSync fails', async () => {
    const site = makeSite();

    mockExistsSync.mockImplementation(
      (p) => p === '/project/src/core/consumer.test.ts',
    );
    mockReadFileSync.mockImplementation(() => {
      throw new Error('EACCES');
    });

    const results = await checkTestCoverage([site], '/project');

    expect(results[0].hasTest).toBe(false);
  });

  it('finds integration test by naming convention (Strategy 3)', async () => {
    const site = makeSite();

    mockReaddirSync.mockReturnValue([
      'consumer.test.ts' as unknown as ReturnType<typeof readdirSync>[number],
      'other.test.ts' as unknown as ReturnType<typeof readdirSync>[number],
    ]);
    mockExistsSync.mockImplementation(
      (p) => p === '/project/src/__tests__/integration/consumer.test.ts',
    );
    mockReadFileSync.mockReturnValue('it("integration", () => {});');
    mockCountTestCases.mockReturnValue({
      filePath: '/project/src/__tests__/integration/consumer.test.ts',
      fileType: 'test',
      total: 1,
      basic: 1,
      complex: 0,
    });

    const results = await checkTestCoverage([site], '/project');

    expect(results[0].hasTest).toBe(true);
    expect(results[0].testFilePath).toBe(
      '/project/src/__tests__/integration/consumer.test.ts',
    );
  });

  it('matches integration test with prefix pattern (name-suffix)', async () => {
    const site = makeSite();

    mockReaddirSync.mockReturnValue([
      'consumer-e2e.test.ts' as unknown as ReturnType<
        typeof readdirSync
      >[number],
    ]);
    mockExistsSync.mockImplementation(
      (p) => p === '/project/src/__tests__/integration/consumer-e2e.test.ts',
    );
    mockReadFileSync.mockReturnValue('it("e2e", () => {});');
    mockCountTestCases.mockReturnValue({
      filePath: '/project/src/__tests__/integration/consumer-e2e.test.ts',
      fileType: 'test',
      total: 1,
      basic: 1,
      complex: 0,
    });

    const results = await checkTestCoverage([site], '/project');

    expect(results[0].hasTest).toBe(true);
  });

  it('handles multiple usage sites correctly', async () => {
    const site1 = makeSite({ filePath: '/project/src/a.ts' });
    const site2 = makeSite({ filePath: '/project/src/b.ts' });

    // Only site1 has a test
    mockExistsSync.mockImplementation((p) => p === '/project/src/a.test.ts');
    mockReadFileSync.mockReturnValue('it("test", () => {});');
    mockCountTestCases.mockReturnValue({
      filePath: '/project/src/a.test.ts',
      fileType: 'test',
      total: 1,
      basic: 1,
      complex: 0,
    });

    const results = await checkTestCoverage([site1, site2], '/project');

    expect(results).toHaveLength(2);
    expect(results[0].hasTest).toBe(true);
    expect(results[1].hasTest).toBe(false);
  });

  it('prefers co-located over mirror over integration', async () => {
    const site = makeSite();

    // Both co-located and mirror exist
    mockExistsSync.mockImplementation(
      (p) =>
        p === '/project/src/core/consumer.test.ts' ||
        p === '/project/src/__tests__/unit/core/consumer.test.ts',
    );
    mockReadFileSync.mockReturnValue('it("test", () => {});');
    mockCountTestCases.mockReturnValue({
      filePath: '',
      fileType: 'test',
      total: 1,
      basic: 1,
      complex: 0,
    });

    const results = await checkTestCoverage([site], '/project');

    // Should find co-located first
    expect(results[0].testFilePath).toBe('/project/src/core/consumer.test.ts');
  });
});

describe('generateCoverageWarnings', () => {
  it('generates warnings for uncovered sites', () => {
    const results = [
      {
        usageSite: makeSite({ importedNames: ['foo', 'bar'] }),
        hasTest: false,
        testFilePath: null,
        testCount: 0,
      },
    ];

    const warnings = generateCoverageWarnings(results);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('UNCOVERED');
    expect(warnings[0]).toContain('foo, bar');
    expect(warnings[0]).toContain('/project/src/core/consumer.ts');
  });

  it('returns empty array when all sites are covered', () => {
    const results = [
      {
        usageSite: makeSite(),
        hasTest: true,
        testFilePath: '/project/src/core/consumer.test.ts',
        testCount: 3,
      },
    ];

    const warnings = generateCoverageWarnings(results);

    expect(warnings).toHaveLength(0);
  });

  it('handles default import names', () => {
    const results = [
      {
        usageSite: makeSite({ importedNames: [] }),
        hasTest: false,
        testFilePath: null,
        testCount: 0,
      },
    ];

    const warnings = generateCoverageWarnings(results);

    expect(warnings[0]).toContain('(default)');
  });
});
