/**
 * MCP tool handler: coverage-verify
 * Verifies test coverage for a shared module's usage sites within the fractal subtree.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

import { extractDependencies } from '../../ast/dependency-extractor.js';
import { scanProject } from '../../core/tree/fractal-tree.js';
import {
  checkTestCoverage,
  generateCoverageWarnings,
} from '../../core/coverage/test-coverage-checker.js';
import { findSubtreeUsages } from '../../core/coverage/usage-tracker.js';
import type { CoverageVerifyResult } from '../../types/coverage.js';

export interface CoverageVerifyInput {
  /** Absolute path to project root */
  projectRoot: string;
  /** Absolute or relative path to the shared module to track */
  targetPath: string;
  /** Optional: limit search to a subtree root */
  subtreeRoot?: string;
  /** Optional: specific export names to track (default: all exports) */
  exportNames?: string[];
}

/**
 * Handle coverage_verify MCP tool calls.
 *
 * Pipeline:
 * 1. Resolve targetPath (relative -> absolute)
 * 2. Read target module content
 * 3. Extract exports from target module
 * 4. Scan project once to get tree
 * 5. Find all subtree usages (pass tree to avoid rescan)
 * 6. Check test coverage
 * 7. Generate warnings
 * 8. Return CoverageVerifyResult
 */
export async function handleCoverageVerify(
  args: unknown,
): Promise<CoverageVerifyResult> {
  const input = args as CoverageVerifyInput;

  if (!input.projectRoot) {
    throw new Error('projectRoot is required');
  }
  if (!input.targetPath) {
    throw new Error('targetPath is required');
  }

  // 1. Resolve targetPath
  const absTarget = path.isAbsolute(input.targetPath)
    ? input.targetPath
    : path.join(input.projectRoot, input.targetPath);

  // 2. Read target module content
  let targetContent: string;
  try {
    targetContent = readFileSync(absTarget, 'utf-8');
  } catch {
    throw new Error(`Target module not found or unreadable: ${absTarget}`);
  }

  // 3. Extract exports
  let targetExports: string[];
  try {
    const depInfo = await extractDependencies(targetContent, absTarget);
    targetExports = depInfo.exports
      .filter((e) => !e.isTypeOnly)
      .map((e) => e.name);
  } catch {
    targetExports = [];
  }

  // Filter to specific export names if provided
  if (input.exportNames && input.exportNames.length > 0) {
    const allowed = new Set(input.exportNames);
    targetExports = targetExports.filter((e) => allowed.has(e));
  }

  // 4. Scan project once
  const tree = await scanProject(input.projectRoot);

  // 5. Find subtree usages (pass pre-scanned tree)
  const subtreeRoot = input.subtreeRoot
    ? path.isAbsolute(input.subtreeRoot)
      ? input.subtreeRoot
      : path.join(input.projectRoot, input.subtreeRoot)
    : undefined;

  const usageSites = await findSubtreeUsages(
    input.projectRoot,
    absTarget,
    subtreeRoot,
    tree,
  );

  // 6. Check test coverage
  const coverageResults = await checkTestCoverage(
    usageSites,
    input.projectRoot,
  );

  // 7. Generate warnings
  const warnings = generateCoverageWarnings(coverageResults);

  // 8. Build result
  const coveredCount = coverageResults.filter((r) => r.hasTest).length;
  const uncoveredCount = coverageResults.filter((r) => !r.hasTest).length;
  const total = coverageResults.length;
  const coverageRatio = total > 0 ? coveredCount / total : 1.0;

  return {
    targetPath: absTarget,
    targetExports,
    usages: coverageResults,
    coveredCount,
    uncoveredCount,
    coverageRatio,
    warnings,
  };
}
