import { classifyNode } from '../../organ-classifier/organ-classifier.js';
import type { NodeEntry } from '../tree-builder/build-fractal-tree.js';

/**
 * Post-correction pass: bottom-up re-classify nodes based on actual fractal
 * descendants to fix hasFractalChildren values computed in a single top-down pass.
 */
export function correctNodeTypes(
  nodeEntries: NodeEntry[],
  childrenMap: Map<string, string[]>,
): NodeEntry[] {
  const typeMap = new Map<string, string>(
    nodeEntries.map((e) => [e.path, e.type]),
  );

  // 깊이 역순 정렬 (deepest first = bottom-up)
  const sortedByDepth = [...nodeEntries].sort(
    (a, b) => b.path.split('/').length - a.path.split('/').length,
  );

  for (const entry of sortedByDepth) {
    const children = childrenMap.get(entry.path) ?? [];

    const hasFractalChildrenActual = children.some(
      (childPath) =>
        typeMap.get(childPath) === 'fractal' ||
        typeMap.get(childPath) === 'pure-function',
    );
    const isLeafActual = children.length === 0;

    const newType = classifyNode({
      dirName: entry.name,
      hasIntentMd: entry.hasIntentMd,
      hasDetailMd: entry.hasDetailMd,
      hasFractalChildren: hasFractalChildrenActual,
      isLeafDirectory: isLeafActual,
      hasIndex: entry.hasIndex ?? false,
    });

    if (newType !== entry.type) {
      entry.type = newType;
      typeMap.set(entry.path, newType);
    }
  }

  return nodeEntries;
}
