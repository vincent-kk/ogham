import { describe, expect, it } from 'vitest';

import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import {
  findLowestCommonFractal,
  getAncestorPaths,
  resolveOwningFractal,
} from '../../../core/analysis/lcaCalculator/lcaCalculator.js';
import { buildFractalTree } from '../../../core/tree/fractalTree/fractalTree.js';
import type { NodeEntry } from '../../../core/tree/fractalTree/fractalTree.js';
import type { FractalTree } from '../../../types/fractal.js';

const POSIX_PATHS = {
  ROOT: '/root',
  A: '/root/a',
  B: '/root/b',
  AX: '/root/a/x',
  AY: '/root/a/y',
  BZ: '/root/b/z',
  AX_FILE: '/root/a/x/value.unit',
  AY_FILE: '/root/a/y/value.unit',
  BZ_FILE: '/root/b/z/value.unit',
  UNKNOWN: '/nonexistent',
  OUTSIDE: '/outside/value.unit',
  PREFIX_COLLISION: '/rooted/a/value.unit',
} as const;

const WINDOWS_PATHS = {
  ROOT: 'C:\\Repo',
  A: 'C:\\Repo\\A',
  ORGAN: 'C:\\Repo\\A\\tools',
  A_ALIAS: 'c:/repo/a',
  ORGAN_FILE: 'C:\\Repo\\A\\tools\\value.unit',
  ORGAN_FILE_ALIAS: 'c:/repo/a/tools/value.unit',
  ORGAN_FILE_ONE: 'C:\\Repo\\A\\tools\\one.unit',
  ORGAN_FILE_TWO: 'C:\\Repo\\A\\tools\\two.unit',
} as const;

const TEST_TREE_ENTRIES: NodeEntry[] = [
  [POSIX_PATHS.ROOT, 'root'],
  [POSIX_PATHS.A, 'a'],
  [POSIX_PATHS.B, 'b'],
  [POSIX_PATHS.AX, 'x'],
  [POSIX_PATHS.AY, 'y'],
  [POSIX_PATHS.BZ, 'z'],
].map(([path, name]) => ({
  path,
  name,
  type: NODE_TYPES.FRACTAL,
  hasIntentMd: false,
  hasDetailMd: false,
}));

const WINDOWS_TREE_ENTRIES: NodeEntry[] = [
  {
    path: WINDOWS_PATHS.ROOT,
    name: 'Repo',
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
  },
  {
    path: WINDOWS_PATHS.A,
    name: 'A',
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
  },
  {
    path: WINDOWS_PATHS.ORGAN,
    name: 'tools',
    type: NODE_TYPES.ORGAN,
    hasIntentMd: false,
    hasDetailMd: false,
  },
];

const AX_ANCESTORS = [POSIX_PATHS.AX, POSIX_PATHS.A, POSIX_PATHS.ROOT];
const ROOT_ANCESTORS = [POSIX_PATHS.ROOT];
const WINDOWS_A_ANCESTORS = [WINDOWS_PATHS.A, WINDOWS_PATHS.ROOT];
const NO_PATHS: string[] = [];
const SINGLE_CONSUMER = [POSIX_PATHS.AX_FILE];
const SIBLING_CONSUMERS = [POSIX_PATHS.AX_FILE, POSIX_PATHS.AY_FILE];
const CROSS_BRANCH_CONSUMERS = [POSIX_PATHS.AX_FILE, POSIX_PATHS.BZ_FILE];
const THREE_CONSUMERS = [
  POSIX_PATHS.AX_FILE,
  POSIX_PATHS.AY_FILE,
  POSIX_PATHS.BZ_FILE,
];
const ORGAN_CONSUMERS = [
  WINDOWS_PATHS.ORGAN_FILE_ONE,
  WINDOWS_PATHS.ORGAN_FILE_TWO,
];
const PARTIALLY_UNKNOWN_CONSUMERS = [POSIX_PATHS.AX_FILE, POSIX_PATHS.OUTSIDE];

// 헬퍼: 트리 구축
//  /root
//  ├── /root/a
//  │   ├── /root/a/x
//  │   └── /root/a/y
//  └── /root/b
//      └── /root/b/z
function buildTestTree(): FractalTree {
  return buildFractalTree(TEST_TREE_ENTRIES);
}

function buildWindowsTree(): FractalTree {
  return buildFractalTree(WINDOWS_TREE_ENTRIES);
}

describe('lca-calculator', () => {
  describe('getAncestorPaths', () => {
    it('should return path chain from node to root (inclusive)', () => {
      const tree = buildTestTree();
      const paths = getAncestorPaths(tree, POSIX_PATHS.AX);
      expect(paths).toEqual(AX_ANCESTORS);
    });

    it('should return single element for root node', () => {
      const tree = buildTestTree();
      const paths = getAncestorPaths(tree, POSIX_PATHS.ROOT);
      expect(paths).toEqual(ROOT_ANCESTORS);
    });

    it('should return empty array for unknown node', () => {
      const tree = buildTestTree();
      const paths = getAncestorPaths(tree, POSIX_PATHS.UNKNOWN);
      expect(paths).toEqual(NO_PATHS);
    });
  });

  describe('portable owner resolution', () => {
    it('returns a canonical ancestor chain for a Windows path alias', () => {
      expect(
        getAncestorPaths(buildWindowsTree(), WINDOWS_PATHS.A_ALIAS),
      ).toEqual(WINDOWS_A_ANCESTORS);
    });

    it('resolves an exact fractal directory to itself', () => {
      expect(resolveOwningFractal(buildTestTree(), POSIX_PATHS.AX)?.path).toBe(
        POSIX_PATHS.AX,
      );
    });

    it('resolves a file in an organ to the nearest owning fractal', () => {
      expect(
        resolveOwningFractal(buildWindowsTree(), WINDOWS_PATHS.ORGAN_FILE)
          ?.path,
      ).toBe(WINDOWS_PATHS.A);
    });

    it('resolves Windows separator and case aliases without host assumptions', () => {
      expect(
        resolveOwningFractal(buildWindowsTree(), WINDOWS_PATHS.ORGAN_FILE_ALIAS)
          ?.path,
      ).toBe(WINDOWS_PATHS.A);
    });

    it('does not confuse a project-root prefix with containment', () => {
      expect(
        resolveOwningFractal(buildTestTree(), POSIX_PATHS.PREFIX_COLLISION),
      ).toBeNull();
    });
  });

  describe('findLowestCommonFractal', () => {
    it('returns null when no consumers are supplied', () => {
      expect(findLowestCommonFractal(buildTestTree(), NO_PATHS)).toBeNull();
    });

    it('returns the owner fractal for one consumer', () => {
      expect(
        findLowestCommonFractal(buildTestTree(), SINGLE_CONSUMER)?.path,
      ).toBe(POSIX_PATHS.AX);
    });

    it('returns the common parent fractal for sibling consumers', () => {
      expect(
        findLowestCommonFractal(buildTestTree(), SIBLING_CONSUMERS)?.path,
      ).toBe(POSIX_PATHS.A);
    });

    it('returns the root fractal for consumers in different branches', () => {
      expect(
        findLowestCommonFractal(buildTestTree(), CROSS_BRANCH_CONSUMERS)?.path,
      ).toBe(POSIX_PATHS.ROOT);
    });

    it('intersects all three consumer owner chains', () => {
      expect(
        findLowestCommonFractal(buildTestTree(), THREE_CONSUMERS)?.path,
      ).toBe(POSIX_PATHS.ROOT);
    });

    it('returns the owner rather than an organ node', () => {
      expect(
        findLowestCommonFractal(buildWindowsTree(), ORGAN_CONSUMERS)?.path,
      ).toBe(WINDOWS_PATHS.A);
    });

    it('does not fall back when any consumer owner is unknown', () => {
      expect(
        findLowestCommonFractal(buildTestTree(), PARTIALLY_UNKNOWN_CONSUMERS),
      ).toBeNull();
    });
  });
});
