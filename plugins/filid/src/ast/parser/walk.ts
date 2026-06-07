import type { SgNode } from '@ast-grep/napi';

/**
 * Recursive AST node visitor using tree-sitter children.
 */
export function walk(node: SgNode, fn: (n: SgNode) => void): void {
  if (!node) return;
  fn(node);
  const children = node.children?.();
  if (children) {
    for (const child of children) {
      walk(child, fn);
    }
  }
}
