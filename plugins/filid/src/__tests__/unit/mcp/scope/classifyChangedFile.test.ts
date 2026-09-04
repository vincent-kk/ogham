import { describe, expect, it, vi } from 'vitest';

import { NODE_TYPES } from '../../../../constants/nodeTypes.js';
import {
  type NodeEntry,
  buildFractalTree,
} from '../../../../core/tree/fractalTree/index.js';
import { classifyChangedFile } from '../../../../mcp/tools/reviewState/scope/classifyChangedFile.js';
import type { ReviewChangedFile } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

const PROJECT_ROOT = '/project';
const TREE_ENTRIES: NodeEntry[] = [
  {
    path: PROJECT_ROOT,
    name: 'project',
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
  },
  {
    path: `${PROJECT_ROOT}/src`,
    name: 'src',
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
  },
];

function entry(path: string, change: ReviewChangedFile['change'] = 'M') {
  return { path, change, insertions: 1, deletions: 1 };
}

describe('classifyChangedFile', () => {
  it.each([
    ['src/generated/value.test.ts', 'generated', 'test-record'],
    ['src/README.md', 'document', 'test-record'],
    ['src/value.test.ts', 'verification', 'test-record'],
    ['src/value.ts', 'source', 'unsupported'],
  ] as const)(
    'classifies %s as %s in priority order',
    (path, role, classified) => {
      const classifyVerification = vi.fn(() => classified);
      const result = classifyChangedFile(entry(path), {
        generatedPaths: ['src/generated'],
        tree: buildFractalTree(TREE_ENTRIES),
        projectRoot: PROJECT_ROOT,
        classifyVerification,
      });

      expect(result).toMatchObject({ role, owner: 'src' });
    },
  );

  it('does not read a deleted verification-looking file', () => {
    const classifyVerification = vi.fn(() => {
      throw new Error('deleted file was read');
    });
    const result = classifyChangedFile(entry('src/deleted.test.ts', 'D'), {
      generatedPaths: [],
      tree: buildFractalTree(TREE_ENTRIES),
      projectRoot: PROJECT_ROOT,
      classifyVerification,
    });

    expect(result).toMatchObject({ role: 'source', owner: 'src' });
    expect(classifyVerification).not.toHaveBeenCalled();
  });
});
