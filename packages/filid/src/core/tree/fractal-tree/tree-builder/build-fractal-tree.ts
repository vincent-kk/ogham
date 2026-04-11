import type { CategoryType, FractalNode, FractalTree } from '../../../../types/fractal.js';

/** Input entry for buildFractalTree */
export interface NodeEntry {
  path: string;
  name: string;
  type: CategoryType;
  hasIntentMd: boolean;
  hasDetailMd: boolean;
  hasIndex?: boolean;
  hasMain?: boolean;
  peerFiles?: string[];
  eponymousFile?: string | null;
  frameworkReservedFiles?: string[];
}

/**
 * Find the closest parent path.
 * Returns the deepest ancestor path among entries.
 */
function findParentPath(path: string, allPaths: string[]): string | null {
  let bestParent: string | null = null;
  let bestLen = 0;

  for (const candidate of allPaths) {
    if (candidate === path) continue;
    if (path.startsWith(candidate + '/') && candidate.length > bestLen) {
      bestParent = candidate;
      bestLen = candidate.length;
    }
  }

  return bestParent;
}

/**
 * Build a FractalTree from a NodeEntry array.
 * Automatically infers parent-child/organ relationships from paths.
 */
export function buildFractalTree(entries: NodeEntry[]): FractalTree {
  if (entries.length === 0) {
    return { root: '', nodes: new Map(), depth: 0, totalNodes: 0 };
  }

  // Sort by path length ascending (parents first)
  const sorted = [...entries].sort((a, b) => a.path.length - b.path.length);
  const allPaths = sorted.map((e) => e.path);

  const nodes = new Map<string, FractalNode>();

  // Step 1: Create all nodes
  for (const e of sorted) {
    nodes.set(e.path, {
      path: e.path,
      name: e.name,
      type: e.type,
      parent: null,
      children: [],
      organs: [],
      hasIntentMd: e.hasIntentMd,
      hasDetailMd: e.hasDetailMd,
      hasIndex: e.hasIndex ?? false,
      hasMain: e.hasMain ?? false,
      depth: 0,
      metadata: {
        ...(e.peerFiles ? { peerFiles: e.peerFiles } : {}),
        ...(e.eponymousFile !== undefined
          ? { eponymousFile: e.eponymousFile }
          : {}),
        ...(e.frameworkReservedFiles
          ? { frameworkReservedFiles: e.frameworkReservedFiles }
          : {}),
      },
    });
  }

  // Step 2: Establish parent-child relationships and compute depth
  for (const e of sorted) {
    const parentPath = findParentPath(e.path, allPaths);
    if (parentPath === null) continue;

    const node = nodes.get(e.path)!;
    const parent = nodes.get(parentPath)!;
    node.parent = parentPath;
    node.depth = parent.depth + 1;

    if (e.type === 'organ') {
      parent.organs.push(e.path);
    } else {
      parent.children.push(e.path);
    }
  }

  // Root: shortest path among nodes with null parent
  const root =
    sorted.find((e) => nodes.get(e.path)!.parent === null)?.path ?? '';

  // Compute max depth
  let maxDepth = 0;
  for (const node of nodes.values()) {
    if (node.depth > maxDepth) {
      maxDepth = node.depth;
    }
  }

  return { root, nodes, depth: maxDepth, totalNodes: nodes.size };
}
