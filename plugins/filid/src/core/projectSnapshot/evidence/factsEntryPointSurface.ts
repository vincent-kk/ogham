import { FACTS_FILE_STATES } from '../../../constants/facts.js';
import type {
  EntryPointDescriptor,
  EntryPointSurfaceEvidence,
} from '../../../types/fractal.js';
import type { FileFacts } from '../../facts/index.js';
import type { FactsFileState } from '../../facts/index.js';

/** One entry point's surface evidence, and whether a report is owed for it. */
export interface FactsEntryPointSurface {
  evidence: EntryPointSurfaceEvidence;
  /** Why no record could be read, or null when one was. */
  reason: string | null;
  /** The file's facts state, which decides what ends the silence. */
  state: FactsFileState;
}

/**
 * Turn what the store holds about one entry point into surface evidence.
 *
 * Only an `exact` record with an `entrySurface` answers the question. Any
 * other state leaves the surface `indeterminate` — an empty name list would be
 * indistinguishable from a module that exports nothing, and the boundary rules
 * treat those two differently.
 *
 * A file the scope excludes is reported too, `unsupported` rather than
 * indeterminate: the entry-point rule warns about that surface either way, and
 * a warning with no diagnostic beside it leaves its reader nothing to do.
 *
 * @param entryPoint - Descriptor the evidence belongs to.
 * @param entrySurface - The record's entry surface, when it carries one.
 * @param state - The file's facts state (spec §3).
 * @returns The evidence, and the reason a report is owed for it.
 */
export function factsEntryPointSurface(
  entryPoint: EntryPointDescriptor,
  entrySurface: FileFacts['entrySurface'],
  state: FactsFileState,
): FactsEntryPointSurface {
  if (state === FACTS_FILE_STATES.EXACT && entrySurface !== undefined)
    return {
      evidence: {
        entryPoint,
        exportedNames: entrySurface.exportedNames.map(({ name }) => name),
        hasDirectDeclarations: entrySurface.hasDirectDeclarations,
        certainty: entrySurface.certainty,
      },
      reason: null,
      state,
    };
  const outOfScope = state === FACTS_FILE_STATES.UNSUPPORTED;
  return {
    evidence: {
      entryPoint,
      exportedNames: [],
      hasDirectDeclarations: false,
      certainty: outOfScope ? 'unsupported' : 'indeterminate',
    },
    reason: outOfScope
      ? 'the declared facts scope excludes it, so no record can exist'
      : state === FACTS_FILE_STATES.EXACT
        ? 'its record reports no entry surface'
        : `the file is ${state}`,
    state,
  };
}
