import { pathForCompare } from '@ogham/cross-platform/paths';

import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import type { FractalNode, FractalTree } from '../../../types/fractal.js';

import { resolveOwningFractal } from './resolveOwningFractal.js';

function fractalChain(tree: FractalTree, start: FractalNode): FractalNode[] {
  const chain: FractalNode[] = [];
  let current: FractalNode | undefined = start;
  while (current) {
    if (current.type === NODE_TYPES.FRACTAL) chain.push(current);
    current = current.parentFractalPath
      ? tree.nodes.get(current.parentFractalPath)
      : undefined;
  }
  return chain;
}

export function findLowestCommonFractal(
  tree: FractalTree,
  consumerPaths: string[],
): FractalNode | null {
  if (consumerPaths.length === 0) return null;
  const owners = consumerPaths.map((path) => resolveOwningFractal(tree, path));
  if (owners.some((owner) => owner === null)) return null;
  const chains = (owners as FractalNode[]).map((owner) =>
    fractalChain(tree, owner),
  );
  if (chains.some((chain) => chain.length === 0)) return null;
  const common = chains
    .slice(1)
    .map((chain) => new Set(chain.map((node) => pathForCompare(node.path))));
  return (
    chains[0].find((node) =>
      common.every((paths) => paths.has(pathForCompare(node.path))),
    ) ?? null
  );
}
