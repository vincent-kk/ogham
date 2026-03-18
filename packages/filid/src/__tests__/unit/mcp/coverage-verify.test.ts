import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleCoverageVerify } from '../../../mcp/tools/coverage-verify.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ''),
  readdirSync: vi.fn(() => []),
}));

vi.mock('../../../ast/dependency-extractor.js', () => ({
  extractDependencies: vi.fn(),
}));

vi.mock('../../../core/tree/fractal-tree.js', () => ({
  scanProject: vi.fn(),
  getDescendants: vi.fn(() => []),
  getFractalsUnderOrgans: vi.fn(() => []),
}));

vi.mock('../../../core/coverage/import-resolver.js', () => ({
  resolveImportPath: vi.fn(() => null),
}));

vi.mock('../../../metrics/test-counter.js', () => ({
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
  await import('../../../ast/dependency-extractor.js');
const { scanProject, getDescendants, getFractalsUnderOrgans } =
  await import('../../../core/tree/fractal-tree.js');
const { resolveImportPath } =
  await import('../../../core/coverage/import-resolver.js');

const mockExtractDeps = vi.mocked(extractDependencies);
const mockScanProject = vi.mocked(scanProject);
const mockGetDescendants = vi.mocked(getDescendants);
const mockGetFractalsUnderOrgans = vi.mocked(getFractalsUnderOrgans);
const mockResolveImport = vi.mocked(resolveImportPath);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleCoverageVerify', () => {
  // === Core tests (3) ===

  it('returns valid CoverageVerifyResult for happy path', async () => {
    // Setup: target module exists with one export
    mockReadFileSync.mockImplementation((p) => {
      if (p === '/project/src/shared/utils.ts') {
        return 'export function foo() {}';
      }
      if (p === '/project/src/core/service.ts') {
        return 'import { foo } from "../shared/utils.js";';
      }
      return '';
    });

    mockExtractDeps.mockImplementation(async (_source, filePath) => {
      if (filePath === '/project/src/shared/utils.ts') {
        return {
          filePath: filePath!,
          imports: [],
          exports: [
            { name: 'foo', isTypeOnly: false, isDefault: false, line: 1 },
          ],
          calls: [],
        };
      }
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

    mockGetDescendants.mockReturnValue([coreNode]);
    mockGetFractalsUnderOrgans.mockReturnValue([]);
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
    mockGetDescendants.mockReturnValue([]);
    mockGetFractalsUnderOrgans.mockReturnValue([]);

    const result = await handleCoverageVerify({
      projectRoot: '/project',
      targetPath: '/project/src/shared/utils.ts',
    });

    expect(result.usages).toHaveLength(0);
    expect(result.coveredCount).toBe(0);
    expect(result.uncoveredCount).toBe(0);
    expect(result.coverageRatio).toBe(1.0);
    expect(result.warnings).toHaveLength(0);
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
    mockGetDescendants.mockReturnValue([]);
    mockGetFractalsUnderOrgans.mockReturnValue([]);

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
    mockGetDescendants.mockReturnValue([]);
    mockGetFractalsUnderOrgans.mockReturnValue([]);

    await handleCoverageVerify({
      projectRoot: '/project',
      targetPath: '/project/src/mod.ts',
    });

    expect(mockScanProject).toHaveBeenCalledTimes(1);
  });
});
