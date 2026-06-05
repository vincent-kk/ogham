import type { SgNode } from '@ast-grep/napi';

export function getNameFromNode(node: SgNode, nameKind: string): string | null {
  const nameNode = node.children().find((c: SgNode) => c.kind() === nameKind);
  return nameNode ? nameNode.text() : null;
}
