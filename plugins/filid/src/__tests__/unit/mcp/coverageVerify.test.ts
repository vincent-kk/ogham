import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleCoverageVerify } from '../../../mcp/tools/coverageVerify/coverageVerify.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ''),
  readdirSync: vi.fn(() => []),
}));

vi.mock('../../../ast/dependencyExtractor/dependencyExtractor.js', () => ({
  extractDependencies: vi.fn(),
}));

vi.mock('../../../core/tree/fractalTree/fractalTree.js', () => ({
  scanProject: vi.fn(),
}));

vi.mock(
  '../../../core/coverageVerify/importResolver/importResolver.js',
  () => ({
    resolveImportPath: vi.fn(() => null),
  }),
);

vi.mock('../../../metrics/testCounter/testCounter.js', () => ({
  countTestCases: vi.fn(() => ({
    filePath: '',
    fileType: 'test',
    total: 0,
    basic: 0,
    complex: 0,
  })),
}));

const mockReadFileSync = vi.mocked(readFileSync);

const { extractDependencies } =
  await import('../../../ast/dependencyExtractor/dependencyExtractor.js');
const { scanProject } =
  await import('../../../core/tree/fractalTree/fractalTree.js');
const { resolveImportPath } =
  await import('../../../core/coverageVerify/importResolver/importResolver.js');

const mockExtractDeps = vi.mocked(extractDependencies);
const mockScanProject = vi.mocked(scanProject);
const mockResolveImport = vi.mocked(resolveImportPath);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleCoverageVerify', () => {
  // === Core tests (3) ===

  it('returns valid CoverageVerifyResult for happy path', async () => {
    // Setup: target module exists with one export
    mockReadFileSync.mockImplementation((p) => {
      if (p === '/project/src/shared/utils.ts')
        return 'export function foo() {}';

      if (p === '/project/src/core/service.ts')
        return 'import { foo } from "../shared/utils.js";';

      return '';
    });

    mockExtractDeps.mockImplementation(async (_source, filePath) => {
      if (filePath === '/project/src/shared/utils.ts')
        return {
          filePath: filePath!,
          imports: [],
          exports: [
            { name: 'foo', isTypeOnly: false, isDefault: false, line: 1 },
          ],
          calls: [],
        };

      return {
        filePath: filePath!,
        imports: [
          {
            source: '../shared/utils.js',
            specifiers: ['foo'],
            isTypeOnly: false,
            line: 1,
          },
        ],
        exports: [],
        calls: [],
      };
    });

    const rootNode = {
      path: '/project/src',
      name: 'src',
      type: 'fractal' as const,
      parent: null,
      children: ['/project/src/core'],
      organs: [],
      hasIntentMd: false,
      hasDetailMd: false,
      hasIndex: false,
      hasMain: false,
      depth: 0,
      metadata: { peerFiles: [] },
    };

    const coreNode = {
      path: '/project/src/core',
      name: 'core',
      type: 'fractal' as const,
      parent: '/project/src',
      children: [],
      organs: [],
      hasIntentMd: false,
      hasDetailMd: false,
      hasIndex: false,
      hasMain: false,
      depth: 1,
      metadata: { peerFiles: ['service.ts'] },
    };

    const nodes = new Map();
    nodes.set('/project/src', rootNode);
    nodes.set('/project/src/core', coreNode);

    mockScanProject.mockResolvedValue({
      root: '/project/src',
      nodes,
      depth: 1,
      totalNodes: 2,
    });

    mockResolveImport.mockReturnValue('/project/src/shared/utils.ts');

    const result = await handleCoverageVerify({
      projectRoot: '/project',
      targetPath: 'src/shared/utils.ts',
    });

    expect(result.targetPath).toBe('/project/src/shared/utils.ts');
    expect(result.targetExports).toEqual(['foo']);
    expect(result.usages).toHaveLength(1);
    expect(result.uncoveredCount).toBe(1);
    expect(result.coverageRatio).toBe(0);
    expect(result.warnings).toHaveLength(1);
  });

  it('finds usages inside organ directories', async () => {
    // Regression: buildFractalTree files organ dirs under `organs[]`, not
    // `children[]`. A children-only walk skipped every organ node, hiding the
    // utils/ helpers/ scanner/ files that hold most implementation code.
    mockReadFileSync.mockImplementation((p) => {
      if (p === '/project/src/shared/utils.ts')
        return 'export function foo() {}';

      if (p === '/project/src/utils/helper.ts')
        return 'import { foo } from "../shared/utils.js";';

      return '';
    });

    mockExtractDeps.mockImplementation(async (_source, filePath) => {
      if (filePath === '/project/src/shared/utils.ts')
        return {
          filePath: filePath!,
          imports: [],
          exports: [
            { name: 'foo', isTypeOnly: false, isDefault: false, line: 1 },
          ],
          calls: [],
        };

      return {
        filePath: filePath!,
        imports: [
          {
            source: '../shared/utils.js',
            specifiers: ['foo'],
            isTypeOnly: false,
            line: 1,
          },
        ],
        exports: [],
        calls: [],
      };
    });

    const rootNode = {
      path: '/project/src',
      name: 'src',
      type: 'fractal' as const,
      parent: null,
      children: [],
      organs: ['/project/src/utils'],
      hasIntentMd: false,
      hasDetailMd: false,
      hasIndex: false,
      hasMain: false,
      depth: 0,
      metadata: { peerFiles: [] },
    };

    const utilsOrgan = {
      path: '/project/src/utils',
      name: 'utils',
      type: 'organ' as const,
      parent: '/project/src',
      children: [],
      organs: [],
      hasIntentMd: false,
      hasDetailMd: false,
      hasIndex: false,
      hasMain: false,
      depth: 1,
      metadata: { peerFiles: ['helper.ts'] },
    };

    const nodes = new Map();
    nodes.set('/project/src', rootNode);
    nodes.set('/project/src/utils', utilsOrgan);

    mockScanProject.mockResolvedValue({
      root: '/project/src',
      nodes,
      depth: 1,
      totalNodes: 2,
    });
    mockResolveImport.mockReturnValue('/project/src/shared/utils.ts');

    const result = await handleCoverageVerify({
      projectRoot: '/project',
      targetPath: 'src/shared/utils.ts',
    });

    expect(result.usages).toHaveLength(1);
    expect(result.usages[0]!.usageSite.filePath).toBe(
      '/project/src/utils/helper.ts',
    );
    // The organ was reachable, so this is a real ratio — not the vacuous 1.0.
    expect(result.warnings.some((w) => w.startsWith('NO USAGES'))).toBe(false);
  });

  it('returns empty usages when no importers found', async () => {
    mockReadFileSync.mockReturnValue('export function bar() {}');
    mockExtractDeps.mockResolvedValue({
      filePath: '/project/src/shared/utils.ts',
      imports: [],
      exports: [{ name: 'bar', isTypeOnly: false, isDefault: false, line: 1 }],
      calls: [],
    });

    const rootNode = {
      path: '/project/src',
      name: 'src',
      type: 'fractal' as const,
      parent: null,
      children: [],
      organs: [],
      hasIntentMd: false,
      hasDetailMd: false,
      hasIndex: false,
      hasMain: false,
      depth: 0,
      metadata: { peerFiles: [] },
    };

    const nodes = new Map();
    nodes.set('/project/src', rootNode);

    mockScanProject.mockResolvedValue({
      root: '/project/src',
      nodes,
      depth: 0,
      totalNodes: 1,
    });

    const result = await handleCoverageVerify({
      projectRoot: '/project',
      targetPath: '/project/src/shared/utils.ts',
    });

    expect(result.usages).toHaveLength(0);
    expect(result.coveredCount).toBe(0);
    expect(result.uncoveredCount).toBe(0);
    // Vacuously 1.0 — but it must not read as a silent PASS, so the zero-usage
    // case carries an explicit warning saying the ratio checked nothing.
    expect(result.coverageRatio).toBe(1.0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('NO USAGES');
  });

  it('throws descriptive error when targetPath does not exist', async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    await expect(
      handleCoverageVerify({
        projectRoot: '/project',
        targetPath: 'src/nonexistent.ts',
      }),
    ).rejects.toThrow('Target module not found or unreadable');
  });

  // === Edge case tests ===

  it('throws when projectRoot is missing', async () => {
    await expect(
      handleCoverageVerify({ targetPath: 'foo.ts' }),
    ).rejects.toThrow('projectRoot is required');
  });

  it('throws when targetPath is missing', async () => {
    await expect(
      handleCoverageVerify({ projectRoot: '/project' }),
    ).rejects.toThrow('targetPath is required');
  });

  it('filters exports by exportNames when provided', async () => {
    mockReadFileSync.mockReturnValue(
      'export function foo() {} export function bar() {}',
    );
    mockExtractDeps.mockResolvedValue({
      filePath: '/project/src/utils.ts',
      imports: [],
      exports: [
        { name: 'foo', isTypeOnly: false, isDefault: false, line: 1 },
        { name: 'bar', isTypeOnly: false, isDefault: false, line: 2 },
      ],
      calls: [],
    });

    const rootNode = {
      path: '/project/src',
      name: 'src',
      type: 'fractal' as const,
      parent: null,
      children: [],
      organs: [],
      hasIntentMd: false,
      hasDetailMd: false,
      hasIndex: false,
      hasMain: false,
      depth: 0,
      metadata: { peerFiles: [] },
    };

    const nodes = new Map();
    nodes.set('/project/src', rootNode);

    mockScanProject.mockResolvedValue({
      root: '/project/src',
      nodes,
      depth: 0,
      totalNodes: 1,
    });

    const result = await handleCoverageVerify({
      projectRoot: '/project',
      targetPath: '/project/src/utils.ts',
      exportNames: ['foo'],
    });

    expect(result.targetExports).toEqual(['foo']);
  });

  it('calls scanProject exactly once', async () => {
    mockReadFileSync.mockReturnValue('export function x() {}');
    mockExtractDeps.mockResolvedValue({
      filePath: '/project/src/mod.ts',
      imports: [],
      exports: [{ name: 'x', isTypeOnly: false, isDefault: false, line: 1 }],
      calls: [],
    });

    const rootNode = {
      path: '/project/src',
      name: 'src',
      type: 'fractal' as const,
      parent: null,
      children: [],
      organs: [],
      hasIntentMd: false,
      hasDetailMd: false,
      hasIndex: false,
      hasMain: false,
      depth: 0,
      metadata: { peerFiles: [] },
    };

    const nodes = new Map();
    nodes.set('/project/src', rootNode);

    mockScanProject.mockResolvedValue({
      root: '/project/src',
      nodes,
      depth: 0,
      totalNodes: 1,
    });

    await handleCoverageVerify({
      projectRoot: '/project',
      targetPath: '/project/src/mod.ts',
    });

    expect(mockScanProject).toHaveBeenCalledTimes(1);
  });
});
