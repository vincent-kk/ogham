import { readFileSync } from 'node:fs';

import { portableJoin, samePath } from '@ogham/cross-platform/paths';

import { extractDependencies } from '../../../ast/dependencyExtractor/dependencyExtractor.js';
import { SKIP_PATTERNS } from '../../../constants/scanDefaults.js';
import type { UsageSite } from '../../../types/coverage.js';
import type { FractalNode, FractalTree } from '../../../types/fractal.js';
import { scanProject } from '../../tree/fractalTree/fractalTree.js';
import { resolveImportPath } from '../importResolver/importResolver.js';

function shouldSkipFile(fileName: string): boolean {
  return SKIP_PATTERNS.some((pattern) => pattern.test(fileName));
}

/**
 * Find all files in a fractal subtree that import from a given module path.
 *
 * @param projectRoot - Absolute path to project root
 * @param targetPath - Absolute path to the shared module being tracked
 * @param subtreeRoot - Optional absolute path to limit search scope
 * @param tree - Optional pre-scanned FractalTree (avoids redundant scanProject call)
 * @returns Array of UsageSite describing each import location
 */
export async function findSubtreeUsages(
  projectRoot: string,
  targetPath: string,
  subtreeRoot?: string,
  tree?: FractalTree,
): Promise<UsageSite[]> {
  const fractalTree = tree ?? (await scanProject(projectRoot));
  const usages: UsageSite[] = [];

  // Determine the search root
  const searchRoot = subtreeRoot ?? fractalTree.root;
  const rootNode = fractalTree.nodes.get(searchRoot);
  if (!rootNode) return usages;

  // Walk both edge types from the search root. `buildFractalTree` files organ
  // dirs under `organs[]` and everything else under `children[]`, so a
  // children-only walk never reaches an organ node — and organ peer files
  // (utils/, helpers/, scanner/, constants/) hold most implementation code.
  const allNodes = new Map<string, FractalNode>();
  const queue = [searchRoot];
  while (queue.length > 0) {
    const nodePath = queue.shift()!;
    if (allNodes.has(nodePath)) continue;

    const node = fractalTree.nodes.get(nodePath);
    if (!node) continue;

    allNodes.set(nodePath, node);
    queue.push(...node.children, ...node.organs);
  }

  // For each node, iterate peerFiles
  for (const [nodePath, node] of allNodes) {
    const peerFiles = node.metadata?.['peerFiles'] as string[] | undefined;
    if (!peerFiles || peerFiles.length === 0) continue;

    for (const fileName of peerFiles) {
      if (shouldSkipFile(fileName)) continue;
      // Only analyze TypeScript/JavaScript files
      if (!/\.[mc]?[jt]sx?$/.test(fileName)) continue;

      const filePath = portableJoin(nodePath, fileName);

      // Skip if this is the target file itself
      if (samePath(filePath, targetPath)) continue;

      let content: string;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        // File unreadable — skip
        continue;
      }

      let deps;
      try {
        deps = await extractDependencies(content, filePath);
      } catch {
        // AST parse failure — skip
        continue;
      }

      for (const imp of deps.imports) {
        // Skip type-only imports — they don't need runtime tests
        if (imp.isTypeOnly) continue;

        const resolved = resolveImportPath(imp.source, filePath);
        if (resolved && samePath(resolved, targetPath)) {
          usages.push({
            filePath,
            fractalPath: nodePath,
            importedNames: imp.specifiers,
            isTypeOnly: false,
            importLine: imp.line,
          });
          // One UsageSite per file is enough — break inner loop
          break;
        }
      }
    }
  }

  return usages;
}
