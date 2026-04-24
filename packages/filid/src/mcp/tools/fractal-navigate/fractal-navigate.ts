import type { NodeEntry } from '../../../core/tree/fractal-tree/fractal-tree.js';
import type { FractalTree } from '../../../types/fractal.js';

import { handleClassify } from './utils/handle-classify.js';
import { handleSiblingList } from './utils/handle-sibling-list.js';
import { handleTree } from './utils/handle-tree.js';

/** Input for fractal-navigate tool */
export interface FractalNavigateInput {
  /** Action to perform */
  action: 'classify' | 'sibling-list' | 'tree';
  /** Target path */
  path: string;
  /** Directory/file entries for tree construction */
  entries: NodeEntry[];
}

/** Output of fractal-navigate tool */
export interface FractalNavigateOutput {
  /** Node classification (for 'classify' action) */
  classification?: string;
  /** Sibling nodes (for 'sibling-list' action) */
  siblings?: Array<{ name: string; path: string; type: string }>;
  /** Fractal tree (for 'tree' action) */
  tree?: FractalTree;
  /** Error message if action failed */
  error?: string;
}

/**
 * Handle fractal-navigate MCP tool calls.
 *
 * Actions:
 * - classify: Determine if a path is fractal, organ, or pure-function
 * - sibling-list: List sibling directories of a given path
 * - tree: Build the full fractal tree from entries
 */
export function handleFractalNavigate(
  input: FractalNavigateInput,
): FractalNavigateOutput {
  switch (input.action) {
    case 'classify':
      return handleClassify(input);
    case 'sibling-list':
      return handleSiblingList(input);
    case 'tree':
      return handleTree(input);
    default:
      return { error: `Unknown action: ${input.action}` };
  }
}
