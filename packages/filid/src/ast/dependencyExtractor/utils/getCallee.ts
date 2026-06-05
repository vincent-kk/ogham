import type { SgNode } from '@ast-grep/napi';

export function getCallee(node: SgNode): string | null {
  const kind = node.kind();
  if (kind === 'identifier') return node.text();
  if (kind === 'member_expression') {
    const children = node.children();
    const obj = children[0];
    const prop = children.find(
      (c: SgNode) => c.kind() === 'property_identifier',
    );
    if (obj && prop) {
      const objName = getCallee(obj);
      return objName ? `${objName}.${prop.text()}` : null;
    }
  }
  return null;
}
