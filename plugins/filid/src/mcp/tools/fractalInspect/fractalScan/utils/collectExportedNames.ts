import type { FractalNode } from '../../../../../types/fractal.js';

/**
 * Gather the names a node's entry points export, as the adapter inspected them.
 * @param node Snapshot node whose entry-point surfaces are read.
 * @returns Deduplicated export names, or undefined when no surface was
 * inspected — which keeps "nothing exported" distinct from "never looked".
 */
export function collectExportedNames(node: FractalNode): string[] | undefined {
  if (!node.entryPointSurfaces) return undefined;
  return [
    ...new Set(
      node.entryPointSurfaces.flatMap((surface) => surface.exportedNames),
    ),
  ];
}
