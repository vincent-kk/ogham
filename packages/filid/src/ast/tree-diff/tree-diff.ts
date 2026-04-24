/**
 * Semantic AST diff — compares two source code versions and identifies
 * added, removed, or modified top-level declarations while ignoring
 * formatting-only changes. Uses @ast-grep/napi.
 */
import type { TreeDiffChange, TreeDiffResult } from '../../types/ast.js';

import { extractDeclarations } from './utils/extract-declarations.js';

export async function computeTreeDiff(
  oldSource: string,
  newSource: string,
  _filePath = 'diff.ts',
): Promise<TreeDiffResult> {
  const oldMap = new Map(
    (await extractDeclarations(oldSource)).map((d) => [d.name, d]),
  );
  const newMap = new Map(
    (await extractDeclarations(newSource)).map((d) => [d.name, d]),
  );

  const changes: TreeDiffChange[] = [];

  for (const [name, oldDecl] of oldMap) {
    const newDecl = newMap.get(name);
    if (!newDecl) {
      changes.push({
        type: 'removed',
        kind: oldDecl.kind,
        name,
        oldLine: oldDecl.line,
      });
    } else if (oldDecl.normalized !== newDecl.normalized) {
      changes.push({
        type: 'modified',
        kind: oldDecl.kind,
        name,
        oldLine: oldDecl.line,
        newLine: newDecl.line,
      });
    }
  }

  for (const [name, newDecl] of newMap) {
    if (!oldMap.has(name)) {
      changes.push({
        type: 'added',
        kind: newDecl.kind,
        name,
        newLine: newDecl.line,
      });
    }
  }

  return {
    changes,
    hasSemanticChanges: changes.length > 0,
    formattingOnlyChanges:
      changes.length === 0 && oldSource.trim() !== newSource.trim() ? 1 : 0,
  };
}
