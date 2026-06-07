import type { SgNode } from '@ast-grep/napi';

export function getNodeName(node: SgNode): string | null {
  const children = node.children();
  // function_declaration: name is an identifier child
  const nameNode = children.find(
    (c: SgNode) =>
      c.kind() === 'identifier' || c.kind() === 'property_identifier',
  );
  return nameNode ? nameNode.text() : null;
}
