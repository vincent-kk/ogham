import {
  FACTS_FILE_STATES,
  FACTS_RECORD_UNAVAILABLE_NEXT_ACTION,
  FACTS_SCOPE_EXCLUDES_JUDGED_FILE_NEXT_ACTION,
  FACTS_SECTION_UNAVAILABLE_NEXT_ACTION,
} from '../../../constants/facts.js';
import { toProjectRelativePath } from '../../../lib/toProjectRelativePath.js';
import type { StructureAdapter } from '../../../types/adapters.js';
import type {
  EntryPointSurfaceEvidence,
  FractalTree,
  SnapshotDiagnostic,
} from '../../../types/fractal.js';
import type { FactsFileState, ProjectFacts } from '../../facts/index.js';

import { factsEntryPointSurface } from './factsEntryPointSurface.js';

export interface CollectedEntryPointSurfaces {
  diagnostics: SnapshotDiagnostic[];
  filePaths: string[];
}

/**
 * Read every entry point's public surface, from the store or from a manifest.
 *
 * A source entry point's surface comes from its facts record: the server does
 * not read source to decide what a module exports (P1). A manifest entry point
 * is the one exception — a package manifest states its surface in a declared
 * field, so reading it is manifest reading, not interpretation, and manifests
 * sit outside the default facts scope.
 *
 * A surface with no record behind it is `indeterminate` with a diagnostic, not
 * an empty exact surface: "exports nothing" and "nobody looked" are different
 * facts, and the boundary rules read the difference.
 *
 * @param tree Scanned tree whose nodes carry the entry points to inspect.
 * @param adapters Structure adapters, used only for manifest entry points.
 * @param facts One read of the store against the current tree.
 * @param factsStates Each scanned file's state, from that same read.
 * @returns The diagnostics and the hashed entry-point file list; each node's
 * `entryPointSurfaces` is filled in place.
 */
export async function collectEntryPointSurfaces(
  tree: FractalTree,
  adapters: readonly StructureAdapter[],
  facts: ProjectFacts,
  factsStates: ReadonlyMap<string, FactsFileState>,
): Promise<CollectedEntryPointSurfaces> {
  const adapterById = new Map(adapters.map((adapter) => [adapter.id, adapter]));
  const diagnostics: SnapshotDiagnostic[] = [];
  const filePaths: string[] = [];

  for (const node of tree.nodes.values()) {
    node.entryPointSurfaces = [];
    for (const entryPoint of node.entryPoints) {
      filePaths.push(entryPoint.path);
      if (entryPoint.kind !== 'manifest') {
        const path = toProjectRelativePath(tree.root, entryPoint.path);
        const surface = factsEntryPointSurface(
          entryPoint,
          facts.records.get(path)?.record.facts.entrySurface,
          factsStates.get(path) ?? FACTS_FILE_STATES.MISSING,
        );
        node.entryPointSurfaces.push(surface.evidence);
        if (surface.reason !== null)
          diagnostics.push(
            unavailableSurfaceDiagnostic(
              entryPoint.path,
              surface.reason,
              surface.state,
            ),
          );
        continue;
      }
      const adapter = adapterById.get(entryPoint.adapterId);
      if (!adapter) {
        node.entryPointSurfaces.push(unsupportedSurface(entryPoint));
        diagnostics.push({
          code: 'entry-point-adapter-unavailable',
          message: `No active adapter can read the manifest ${entryPoint.path}.`,
          path: entryPoint.path,
          affects: ['boundaries'],
          nextAction:
            "Enable an adapter for this manifest's ecosystem through adapters in .filid/config.json, or accept that its public surface is reported as unsupported.",
        });
        continue;
      }
      try {
        node.entryPointSurfaces.push(
          await adapter.inspectEntryPoint(entryPoint.path),
        );
      } catch (error) {
        node.entryPointSurfaces.push({
          ...unsupportedSurface(entryPoint),
          certainty: 'indeterminate',
        });
        diagnostics.push({
          code: 'entry-point-inspection-failed',
          message: `Could not read the manifest ${entryPoint.path}: ${error instanceof Error ? error.message : String(error)}`,
          path: entryPoint.path,
          affects: ['boundaries'],
          nextAction:
            'Check that the manifest exists and parses, then run again; its public surface stays indeterminate until then.',
        });
      }
    }
  }

  return { diagnostics, filePaths };
}

/**
 * The surface evidence of an entry point nothing could read.
 * @param entryPoint Descriptor the evidence belongs to.
 * @returns Evidence with no names and `unsupported` certainty.
 */
function unsupportedSurface(
  entryPoint: EntryPointSurfaceEvidence['entryPoint'],
): EntryPointSurfaceEvidence {
  return {
    entryPoint,
    exportedNames: [],
    hasDirectDeclarations: false,
    certainty: 'unsupported',
  };
}

/**
 * The report that an entry point's surface has no record behind it.
 *
 * The next action follows the state, because three different things are in the
 * way: a scope that excludes the file, a record that reports no surface, and a
 * file with no usable record at all. One sentence for all three would send two
 * of them somewhere that changes nothing (P5).
 * @param path Absolute path of the entry point.
 * @param reason Why the record could not be read, as the state names it.
 * @param state The file's facts state (spec §3).
 * @returns A boundary-axis diagnostic carrying the action that ends it.
 */
function unavailableSurfaceDiagnostic(
  path: string,
  reason: string,
  state: FactsFileState,
): SnapshotDiagnostic {
  return {
    code: 'entry-point-facts-unavailable',
    message: `The facts store holds no usable entry surface for ${path}: ${reason}.`,
    path,
    affects: ['boundaries'],
    nextAction:
      state === FACTS_FILE_STATES.UNSUPPORTED
        ? FACTS_SCOPE_EXCLUDES_JUDGED_FILE_NEXT_ACTION
        : state === FACTS_FILE_STATES.EXACT
          ? FACTS_SECTION_UNAVAILABLE_NEXT_ACTION
          : FACTS_RECORD_UNAVAILABLE_NEXT_ACTION,
  };
}
