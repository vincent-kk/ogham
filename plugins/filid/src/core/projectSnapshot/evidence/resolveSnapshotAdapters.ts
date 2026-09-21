import { ANALYSIS_AXES } from '../../../constants/analysisAxes.js';
import type {
  AdapterRegistry,
  StructureAdapter,
  VerificationAdapter,
} from '../../../types/adapters.js';
import type { SnapshotDiagnostic } from '../../../types/fractal.js';

export interface SnapshotAdapters {
  structure: StructureAdapter[];
  verification: VerificationAdapter[];
  diagnostics: SnapshotDiagnostic[];
}

/** Build the diagnostic for a thrown adapter-selection error, by its code. */
function buildAdapterSelectionDiagnostic(message: string): SnapshotDiagnostic {
  const unknownId = message.startsWith('unknown-adapter-id');
  return {
    code: unknownId ? 'unknown-adapter-id' : 'adapter-selection-failed',
    message,
    affects: ANALYSIS_AXES,
    nextAction: unknownId
      ? 'Set adapters.enabled in .filid/config.json to adapter ids this filid version ships, or set adapters.mode to "auto", then run again.'
      : 'Check adapters in .filid/config.json, then run again; if it repeats, record this message in your report as a filid defect and continue.',
  };
}

export async function resolveSnapshotAdapters(
  registry: AdapterRegistry,
  enabledIds?: readonly string[],
): Promise<SnapshotAdapters> {
  const diagnostics: SnapshotDiagnostic[] = [];
  let structure: StructureAdapter[] = [];
  let verification: VerificationAdapter[] = [];
  try {
    structure = registry.selectStructure(enabledIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    diagnostics.push(buildAdapterSelectionDiagnostic(message));
  }
  try {
    verification = registry.selectVerification(enabledIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!diagnostics.some((diagnostic) => diagnostic.message === message))
      diagnostics.push(buildAdapterSelectionDiagnostic(message));
  }
  return { structure, verification, diagnostics };
}
