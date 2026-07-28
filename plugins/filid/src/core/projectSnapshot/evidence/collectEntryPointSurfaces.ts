import type { StructureAdapter } from '../../../types/adapters.js';
import type {
  FractalTree,
  SnapshotDiagnostic,
} from '../../../types/fractal.js';

export interface CollectedEntryPointSurfaces {
  diagnostics: SnapshotDiagnostic[];
  filePaths: string[];
}

export async function collectEntryPointSurfaces(
  tree: FractalTree,
  adapters: readonly StructureAdapter[],
): Promise<CollectedEntryPointSurfaces> {
  const adapterById = new Map(adapters.map((adapter) => [adapter.id, adapter]));
  const diagnostics: SnapshotDiagnostic[] = [];
  const filePaths: string[] = [];

  for (const node of tree.nodes.values()) {
    node.entryPointSurfaces = [];
    for (const entryPoint of node.entryPoints) {
      filePaths.push(entryPoint.path);
      const adapter = adapterById.get(entryPoint.adapterId);
      if (!adapter) {
        node.entryPointSurfaces.push({
          entryPoint,
          exportedNames: [],
          hasDirectDeclarations: false,
          certainty: 'unsupported',
        });
        diagnostics.push({
          code: 'entry-point-adapter-unavailable',
          message: `No active adapter can inspect ${entryPoint.path}.`,
          path: entryPoint.path,
        });
        continue;
      }
      try {
        node.entryPointSurfaces.push(
          await adapter.inspectEntryPoint(entryPoint.path),
        );
      } catch (error) {
        node.entryPointSurfaces.push({
          entryPoint,
          exportedNames: [],
          hasDirectDeclarations: false,
          certainty: 'indeterminate',
        });
        diagnostics.push({
          code: 'entry-point-inspection-failed',
          message: error instanceof Error ? error.message : String(error),
          path: entryPoint.path,
        });
      }
    }
  }

  return { diagnostics, filePaths };
}
