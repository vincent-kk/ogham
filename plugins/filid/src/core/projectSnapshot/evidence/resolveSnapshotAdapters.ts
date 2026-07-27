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
    diagnostics.push({
      code: message.startsWith('unknown-adapter-id')
        ? 'unknown-adapter-id'
        : 'adapter-selection-failed',
      message,
    });
  }
  try {
    verification = registry.selectVerification(enabledIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!diagnostics.some((diagnostic) => diagnostic.message === message))
      diagnostics.push({
        code: message.startsWith('unknown-adapter-id')
          ? 'unknown-adapter-id'
          : 'adapter-selection-failed',
        message,
      });
  }
  return { structure, verification, diagnostics };
}
