import {
  pathForCompare,
  portableIsAbsolute,
  portableRelative,
  samePath,
} from '@ogham/cross-platform/paths';

import type {
  CategoryType,
  EntryPointDescriptor,
  FractalNode,
  FractalTree,
} from '../../../../types/fractal.js';

/** Input entry for buildFractalTree */
export interface NodeEntry {
  path: string;
  name: string;
  type: CategoryType;
  hasIntentMd: boolean;
  hasDetailMd: boolean;
  entryPoints?: EntryPointDescriptor[];
  hasIndex?: boolean;
  hasMain?: boolean;
  peerFiles?: string[];
  eponymousFile?: string | null;
  frameworkReservedFiles?: string[];
}

function findParentPath(path: string, allPaths: string[]): string | null {
  let bestParent: string | null = null;
  let bestLen = 0;

  for (const candidate of allPaths) {
    if (samePath(candidate, path)) continue;
    const relative = portableRelative(candidate, path);
    const comparable = pathForCompare(relative);
    const candidateLength = pathForCompare(candidate).length;
    if (
      comparable !== '..' &&
      !comparable.startsWith('../') &&
      !portableIsAbsolute(relative) &&
      candidateLength > bestLen
    ) {
      bestParent = candidate;
      bestLen = candidateLength;
    }
  }

  return bestParent;
}

/**
 * Build a FractalTree from a NodeEntry array.
 * Automatically infers parent-child/organ relationships from paths.
 */
export function buildFractalTree(entries: NodeEntry[]): FractalTree {
  if (entries.length === 0)
    return { root: '', nodes: new Map(), depth: 0, totalNodes: 0 };

  // Sort by path length ascending (parents first)
  const sorted = [...entries].sort((a, b) => a.path.length - b.path.length);
  const allPaths = sorted.map((e) => e.path);

  const nodes = new Map<string, FractalNode>();

  // Step 1: Create all nodes
  for (const e of sorted)
    nodes.set(e.path, {
      path: e.path,
      name: e.name,
      type: e.type,
      parent: null,
      parentFractalPath: null,
      children: [],
      childFractalPaths: [],
      organs: [],
      organPaths: [],
      hasIntentMd: e.hasIntentMd,
      hasDetailMd: e.hasDetailMd,
      entryPoints: e.entryPoints ?? [],
      peerFiles: e.peerFiles ?? [],
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

  // Step 2: Establish parent-child relationships and compute depth
  for (const e of sorted) {
    const parentPath = findParentPath(e.path, allPaths);
    if (parentPath === null) continue;

    const node = nodes.get(e.path)!;
    const parent = nodes.get(parentPath)!;
    node.parent = parentPath;
    node.depth = parent.depth + 1;

    if (e.type === 'organ') parent.organs.push(e.path);
    else parent.children.push(e.path);
  }

  for (const node of nodes.values()) {
    let ownerPath = node.parent;
    while (ownerPath && nodes.get(ownerPath)?.type === 'organ')
      ownerPath = nodes.get(ownerPath)?.parent ?? null;
    node.parentFractalPath = ownerPath;
    if (!ownerPath) continue;
    const owner = nodes.get(ownerPath);
    if (!owner) continue;
    if (node.type === 'organ') owner.organPaths.push(node.path);
    else owner.childFractalPaths.push(node.path);
  }

  // Root: shortest path among nodes with null parent
  const root =
    sorted.find((e) => nodes.get(e.path)!.parent === null)?.path ?? '';

  // Compute max depth
  let maxDepth = 0;
  for (const node of nodes.values())
    if (node.depth > maxDepth) maxDepth = node.depth;

  return { root, nodes, depth: maxDepth, totalNodes: nodes.size };
}
