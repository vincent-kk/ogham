import { projectRoot } from '@ogham/cross-platform/host-paths';

import { createAdapterRegistry } from '../../../adapters/index.js';
import { SNAPSHOT_TOOL_DIAGNOSTIC_CODES } from '../../../constants/mcpContracts.js';
import {
  createDefaultConfig,
  createProjectSnapshot,
  getActiveRules,
  loadBuiltinRules,
  loadConfig,
  resolveMaxDepth,
} from '../../../core/index.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type { Rule } from '../../../types/rules.js';
import type { ToolDiagnostic } from '../../../types/toolEnvelope.js';

export interface ToolSnapshotContext {
  snapshot: ProjectSnapshot;
  rules: Rule[];
  maxDepth: number;
  diagnostics: ToolDiagnostic[];
}

export async function createToolSnapshot(
  path: string,
  maxDepthOverride?: number,
): Promise<ToolSnapshotContext> {
  const root = projectRoot(path);
  const loaded = loadConfig(root);
  const config = loaded.config ?? createDefaultConfig();
  const maxDepth = resolveMaxDepth(config, maxDepthOverride);
  const rules = getActiveRules(
    loadBuiltinRules(config.rules, config.structure?.additionalAllowedPeers),
  );
  const snapshot = await createProjectSnapshot(
    root,
    createAdapterRegistry(),
    config,
  );
  const diagnostics: ToolDiagnostic[] = [
    ...loaded.warnings.map((message) => ({
      code: SNAPSHOT_TOOL_DIAGNOSTIC_CODES.CONFIG_WARNING,
      message,
      path: root,
    })),
    ...loaded.diagnostics,
    ...snapshot.diagnostics,
  ];
  return { snapshot, rules, maxDepth, diagnostics };
}
