/**
 * @file ast-analyze.ts
 * @description Dependency graph / cyclomatic complexity analysis
 */

import { extractDependencies } from '../../../ast/dependency-extractor/dependency-extractor.js';
import { calculateComplexity } from '../../../ast/cyclomatic-complexity/cyclomatic-complexity.js';

export interface AstAnalyzeInput {
  source: string;
  file_path?: string;
  analysis_type: 'dependency-graph' | 'cyclomatic-complexity' | 'full';
}

export async function handleAstAnalyze(input: AstAnalyzeInput) {
  const filePath = input.file_path ?? 'anonymous.ts';

  if (input.analysis_type === 'dependency-graph') {
    return extractDependencies(input.source, filePath);
  }

  if (input.analysis_type === 'cyclomatic-complexity') {
    return calculateComplexity(input.source, filePath);
  }

  // full: run both
  const [deps, complexity] = await Promise.all([
    extractDependencies(input.source, filePath),
    calculateComplexity(input.source, filePath),
  ]);

  return { dependencies: deps, complexity };
}
