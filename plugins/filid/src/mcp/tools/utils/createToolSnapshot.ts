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
import type {
  ProjectSnapshot,
  SnapshotAxisSelection,
} from '../../../types/fractal.js';
import type { Rule } from '../../../types/rules.js';
import type { ToolDiagnostic } from '../../../types/toolEnvelope.js';

export interface ToolSnapshotContext {
  snapshot: ProjectSnapshot;
  rules: Rule[];
  maxDepth: number;
  diagnostics: ToolDiagnostic[];
}

/** Per-call narrowing of the snapshot a tool builds. */
export interface ToolSnapshotOptions {
  /** Max-depth RULE threshold override. */
  maxDepth?: number;
  /**
   * Evidence axes to collect. Omit to collect every axis — a tool that reads
   * only the tree and documents should narrow this, because the dependency and
   * verification axes dominate snapshot cost on a large project.
   */
  axes?: Partial<SnapshotAxisSelection>;
}

/**
 * Build the snapshot, active rules and depth threshold a tool call needs.
 * @param path Absolute path used as the project root for this call.
 * @param options Depth override and evidence-axis narrowing.
 * @returns Snapshot context carrying config and adapter diagnostics.
 */
export async function createToolSnapshot(
  path: string,
  options: ToolSnapshotOptions = {},
): Promise<ToolSnapshotContext> {
  const root = projectRoot(path);
  const loaded = loadConfig(root);
  const config = loaded.config ?? createDefaultConfig();
  const maxDepth = resolveMaxDepth(config, options.maxDepth);
  const rules = getActiveRules(
    loadBuiltinRules(
      config.rules,
      config.structure?.additionalAllowedPeers,
      undefined,
      undefined,
      config.structure?.additionalOrganNames,
    ),
  );
  const snapshot = await createProjectSnapshot(
    root,
    createAdapterRegistry(),
    config,
    { axes: options.axes },
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
