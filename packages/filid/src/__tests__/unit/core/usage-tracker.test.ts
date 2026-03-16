import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  findSubtreeUsages,
  getModuleName,
} from '../../../core/usage-tracker.js';
import type { FractalNode, FractalTree } from '../../../types/fractal.js';

// Mock dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ''),
}));

vi.mock('../../../ast/dependency-extractor.js', () => ({
  extractDependencies: vi.fn(),
}));

vi.mock('../../../core/fractal-tree.js', () => ({
  scanProject: vi.fn(),
  getDescendants: vi.fn(() => []),
  getFractalsUnderOrgans: vi.fn(() => []),
}));

vi.mock('../../../core/import-resolver.js', () => ({
  resolveImportPath: vi.fn(() => null),
}));

const mockReadFileSync = vi.mocked(readFileSync);

// Import mocked modules
const { extractDependencies } =
  await import('../../../ast/dependency-extractor.js');
const { scanProject, getDescendants, getFractalsUnderOrgans } =
  await import('../../../core/fractal-tree.js');
const { resolveImportPath } = await import('../../../core/import-resolver.js');

const mockExtractDeps = vi.mocked(extractDependencies);
const mockScanProject = vi.mocked(scanProject);
const mockGetDescendants = vi.mocked(getDescendants);
const mockGetFractalsUnderOrgans = vi.mocked(getFractalsUnderOrgans);
const mockResolveImport = vi.mocked(resolveImportPath);

function makeNode(path: string, peerFiles: string[] = []): FractalNode {
  return {
    path,
    name: path.split('/').pop() ?? '',
    type: 'fractal',
    parent: null,
    children: [],
    organs: [],
    hasIntentMd: false,
    hasDetailMd: false,
    hasIndex: false,
    hasMain: false,
    depth: 0,
    metadata: { peerFiles },
  };
}

function makeTree(nodes: FractalNode[]): FractalTree {
  const nodeMap = new Map<string, FractalNode>();
  for (const n of nodes) nodeMap.set(n.path, n);
  return {
    root: nodes[0]?.path ?? '',
    nodes: nodeMap,
    depth: 0,
    totalNodes: nodes.length,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('findSubtreeUsages', () => {
  // === Core tests (3) ===

  it('finds files importing targetPath', async () => {
    const rootNode = makeNode('/project/src', ['service.ts']);
    const tree = makeTree([rootNode]);

    mockGetDescendants.mockReturnValue([]);
    mockGetFractalsUnderOrgans.mockReturnValue([]);
    mockReadFileSync.mockReturnValue(
      'import { foo } from "./shared/utils.js";',
    );
    mockExtractDeps.mockResolvedValue({
      filePath: '/project/src/service.ts',
      imports: [
        {
          source: './shared/utils.js',
          specifiers: ['foo'],
          isTypeOnly: false,
          line: 1,
        },
      ],
      exports: [],
      calls: [],
    });
    mockResolveImport.mockReturnValue('/project/src/shared/utils.ts');

    const result = await findSubtreeUsages(
      '/project',
      '/project/src/shared/utils.ts',
      undefined,
      tree,
    );

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('/project/src/service.ts');
    expect(result[0].importedNames).toEqual(['foo']);
    expect(result[0].isTypeOnly).toBe(false);
    expect(result[0].importLine).toBe(1);
  });

  it('uses provided tree and does NOT call scanProject', async () => {
    const rootNode = makeNode('/project/src', []);
    const tree = makeTree([rootNode]);

    mockGetDescendants.mockReturnValue([]);
    mockGetFractalsUnderOrgans.mockReturnValue([]);

    await findSubtreeUsages(
      '/project',
      '/project/src/target.ts',
      undefined,
      tree,
    );

    expect(mockScanProject).not.toHaveBeenCalled();
  });

  it('limits search to subtreeRoot when provided', async () => {
    const rootNode = makeNode('/project/src', ['root-file.ts']);
    const subNode = makeNode('/project/src/sub', ['sub-file.ts']);
    const tree = makeTree([rootNode, subNode]);

    mockGetDescendants.mockReturnValue([]);
    mockGetFractalsUnderOrgans.mockReturnValue([]);
    mockReadFileSync.mockReturnValue('import { bar } from "../target.js";');
    mockExtractDeps.mockResolvedValue({
      filePath: '/project/src/sub/sub-file.ts',
      imports: [
        {
          source: '../target.js',
          specifiers: ['bar'],
          isTypeOnly: false,
          line: 1,
        },
      ],
      exports: [],
      calls: [],
    });
    mockResolveImport.mockReturnValue('/project/src/target.ts');

    const result = await findSubtreeUsages(
      '/project',
      '/project/src/target.ts',
      '/project/src/sub',
      tree,
    );

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('/project/src/sub/sub-file.ts');
  });

  // === Edge case tests ===

  it('returns empty array when no imports match', async () => {
    const rootNode = makeNode('/project/src', ['foo.ts']);
    const tree = makeTree([rootNode]);

    mockGetDescendants.mockReturnValue([]);
    mockGetFractalsUnderOrgans.mockReturnValue([]);
    mockReadFileSync.mockReturnValue('import { x } from "zod";');
    mockExtractDeps.mockResolvedValue({
      filePath: '/project/src/foo.ts',
      imports: [
        {
          source: 'zod',
          specifiers: ['x'],
          isTypeOnly: false,
          line: 1,
        },
      ],
      exports: [],
      calls: [],
    });
    mockResolveImport.mockReturnValue(null);

    const result = await findSubtreeUsages(
      '/project',
      '/project/src/target.ts',
      undefined,
      tree,
    );

    expect(result).toHaveLength(0);
  });

  it('excludes type-only imports', async () => {
    const rootNode = makeNode('/project/src', ['consumer.ts']);
    const tree = makeTree([rootNode]);

    mockGetDescendants.mockReturnValue([]);
    mockGetFractalsUnderOrgans.mockReturnValue([]);
    mockReadFileSync.mockReturnValue('import type { Foo } from "./target.js";');
    mockExtractDeps.mockResolvedValue({
      filePath: '/project/src/consumer.ts',
      imports: [
        {
          source: './target.js',
          specifiers: ['Foo'],
          isTypeOnly: true,
          line: 1,
        },
      ],
      exports: [],
      calls: [],
    });
    mockResolveImport.mockReturnValue('/project/src/target.ts');

    const result = await findSubtreeUsages(
      '/project',
      '/project/src/target.ts',
      undefined,
      tree,
    );

    expect(result).toHaveLength(0);
  });

  it('skips .test.ts and .spec.ts files', async () => {
    const rootNode = makeNode('/project/src', [
      'service.ts',
      'service.test.ts',
      'service.spec.ts',
    ]);
    const tree = makeTree([rootNode]);

    mockGetDescendants.mockReturnValue([]);
    mockGetFractalsUnderOrgans.mockReturnValue([]);
    mockReadFileSync.mockReturnValue('import { foo } from "./target.js";');
    mockExtractDeps.mockResolvedValue({
      filePath: '/project/src/service.ts',
      imports: [
        {
          source: './target.js',
          specifiers: ['foo'],
          isTypeOnly: false,
          line: 1,
        },
      ],
      exports: [],
      calls: [],
    });
    mockResolveImport.mockReturnValue('/project/src/target.ts');

    const result = await findSubtreeUsages(
      '/project',
      '/project/src/target.ts',
      undefined,
      tree,
    );

    // Only service.ts should be analyzed, not .test.ts or .spec.ts
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('/project/src/service.ts');
  });

  it('handles readFileSync failure gracefully', async () => {
    const rootNode = makeNode('/project/src', ['bad-file.ts']);
    const tree = makeTree([rootNode]);

    mockGetDescendants.mockReturnValue([]);
    mockGetFractalsUnderOrgans.mockReturnValue([]);
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const result = await findSubtreeUsages(
      '/project',
      '/project/src/target.ts',
      undefined,
      tree,
    );

    expect(result).toHaveLength(0);
  });

  it('handles extractDependencies AST parse failure gracefully', async () => {
    const rootNode = makeNode('/project/src', ['broken.ts']);
    const tree = makeTree([rootNode]);

    mockGetDescendants.mockReturnValue([]);
    mockGetFractalsUnderOrgans.mockReturnValue([]);
    mockReadFileSync.mockReturnValue('this is not valid typescript {{{');
    mockExtractDeps.mockRejectedValue(new Error('AST parse error'));

    const result = await findSubtreeUsages(
      '/project',
      '/project/src/target.ts',
      undefined,
      tree,
    );

    expect(result).toHaveLength(0);
  });

  it('skips the target file itself', async () => {
    const rootNode = makeNode('/project/src', ['target.ts']);
    const tree = makeTree([rootNode]);

    mockGetDescendants.mockReturnValue([]);
    mockGetFractalsUnderOrgans.mockReturnValue([]);

    const result = await findSubtreeUsages(
      '/project',
      '/project/src/target.ts',
      undefined,
      tree,
    );

    expect(result).toHaveLength(0);
    // Should not even try to read the target file
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  it('returns empty when root node not found in tree', async () => {
    const tree = makeTree([makeNode('/project/src', [])]);

    const result = await findSubtreeUsages(
      '/project',
      '/project/src/target.ts',
      '/nonexistent/path',
      tree,
    );

    expect(result).toHaveLength(0);
  });
});

describe('getModuleName', () => {
  it('strips extension from filename', () => {
    expect(getModuleName('/project/src/core/lca-calculator.ts')).toBe(
      'lca-calculator',
    );
  });

  it('handles .test.ts files', () => {
    expect(getModuleName('/project/src/__tests__/foo.test.ts')).toBe(
      'foo.test',
    );
  });
});
