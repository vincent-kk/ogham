import {
  loadConfig,
  resolveMaxDepth,
} from '../../../core/infra/config-loader/config-loader.js';
import { analyzeModule } from '../../../core/module/module-main-analyzer/module-main-analyzer.js';
import { scanProject } from '../../../core/tree/fractal-tree/fractal-tree.js';
import type { FractalTree, ModuleInfo } from '../../../types/fractal.js';
import type { ScanReportDto } from '../../../types/report.js';

export interface FractalScanInput {
  path: string;
  depth?: number;
  includeModuleInfo?: boolean;
}

/**
 * Handle fractal-scan MCP tool calls.
 *
 * Scans a project directory to build a FractalTree, classifying each
 * directory node as fractal / organ / pure-function / hybrid.
 * When includeModuleInfo is true, also analyses each node's entry points.
 *
 * Returns a {@link ScanReportDto} — the in-process `FractalTree` (whose
 * `nodes` is a `Map`) is converted to a flat `nodes: FractalNode[]` array
 * to avoid Map+Array double serialization in the MCP transport.
 */
export async function handleFractalScan(
  args: unknown,
): Promise<ScanReportDto> {
  const input = args as FractalScanInput;

  if (!input.path) {
    throw new Error('path is required');
  }

  const startTime = Date.now();

  const { config } = loadConfig(input.path);
  const maxDepth = resolveMaxDepth(config, input.depth);
  const tree: FractalTree = await scanProject(input.path, { maxDepth });

  let modules: ModuleInfo[] = [];
  if (input.includeModuleInfo) {
    const nodePaths = Array.from(tree.nodes.keys());
    const results = await Promise.allSettled(
      nodePaths.map((nodePath) => analyzeModule(nodePath)),
    );
    modules = results
      .filter(
        (r): r is PromiseFulfilledResult<ModuleInfo> =>
          r.status === 'fulfilled',
      )
      .map((r) => r.value);
  }

  return {
    tree: {
      root: tree.root,
      depth: tree.depth,
      totalNodes: tree.totalNodes,
      nodes: Array.from(tree.nodes.values()),
    },
    modules,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}
