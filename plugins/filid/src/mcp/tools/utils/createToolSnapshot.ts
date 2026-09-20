import { projectRoot } from '@ogham/cross-platform';

import { createAdapterRegistry } from '../../../adapters/index.js';
import {
  SNAPSHOT_TOOL_DIAGNOSTIC_CODES,
  SNAPSHOT_TOOL_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../../constants/mcpContracts.js';
import {
  createDefaultConfig,
  createProjectSnapshot,
  getActiveRules,
  loadBuiltinRules,
  loadConfig,
  resolveMaxDepth,
} from '../../../core/index.js';
import { runWithRequestMemo } from '../../../lib/runWithRequestMemo.js';
import type {
  ProjectSnapshot,
  SnapshotAxisSelection,
} from '../../../types/fractal.js';
import type { Rule } from '../../../types/rules.js';
import type { ToolDiagnostic } from '../../../types/toolEnvelope.js';

import { configWarningAffects } from './configWarningAffects.js';

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
 *
 * One call is one request-memo scope, so the scan work a snapshot repeats —
 * the ignored-path query, the source-tree walk, the entry points of a
 * directory — runs once here. The scope closes with the snapshot rather than
 * spanning the tool call, because a tool that writes into the project between
 * two snapshots must see the tree it wrote.
 * @param path Absolute path used as the project root for this call.
 * @param options Depth override and evidence-axis narrowing.
 * @returns Snapshot context carrying config and adapter diagnostics.
 */
export function createToolSnapshot(
  path: string,
  options: ToolSnapshotOptions = {},
): Promise<ToolSnapshotContext> {
  return runWithRequestMemo(async (): Promise<ToolSnapshotContext> => {
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
      ...loaded.warnings.map(({ message, key }) => ({
        code: SNAPSHOT_TOOL_DIAGNOSTIC_CODES.CONFIG_WARNING,
        message,
        path: root,
        affects: configWarningAffects(key),
        nextAction: SNAPSHOT_TOOL_DIAGNOSTIC_NEXT_ACTIONS.CONFIG_WARNING,
      })),
      ...loaded.diagnostics,
      ...snapshot.diagnostics,
    ];
    return { snapshot, rules, maxDepth, diagnostics };
  });
}
