import { readFileSync } from 'node:fs';

import { portableJoin, samePath } from '@ogham/cross-platform/paths';

import { extractDependencies } from '../../../ast/dependencyExtractor/dependencyExtractor.js';
import { SKIP_PATTERNS } from '../../../constants/scanDefaults.js';
import type { UsageSite } from '../../../types/coverage.js';
import type { FractalTree } from '../../../types/fractal.js';
import { scanProject } from '../../tree/fractalTree/fractalTree.js';
import { resolveImportPath } from '../importResolver/importResolver.js';

import { collectSubtreeNodes } from './utils/collectSubtreeNodes.js';

function shouldSkipFile(fileName: string): boolean {
  return SKIP_PATTERNS.some((pattern) => pattern.test(fileName));
}

/** Read + parse one candidate file and return its UsageSite when it runtime-imports the target. */
async function findUsageInFile(
  filePath: string,
  nodePath: string,
  targetPath: string,
): Promise<UsageSite | null> {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    // File unreadable — skip
    return null;
  }

  let deps;
  try {
    deps = await extractDependencies(content, filePath);
  } catch {
    // AST parse failure — skip
    return null;
  }

  for (const imp of deps.imports) {
    // Skip type-only imports — they don't need runtime tests
    if (imp.isTypeOnly) continue;

    const resolved = resolveImportPath(imp.source, filePath);
    if (resolved && samePath(resolved, targetPath))
      // One UsageSite per file is enough
      return {
        filePath,
        fractalPath: nodePath,
        importedNames: imp.specifiers,
        isTypeOnly: false,
        importLine: imp.line,
      };
  }

  return null;
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

  const searchRoot = subtreeRoot ?? fractalTree.root;
  if (!fractalTree.nodes.get(searchRoot)) return usages;

  const allNodes = collectSubtreeNodes(fractalTree, searchRoot);

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

      const site = await findUsageInFile(filePath, nodePath, targetPath);
      if (site) usages.push(site);
    }
  }

  return usages;
}
