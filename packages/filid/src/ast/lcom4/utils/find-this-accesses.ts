import type { SgNode } from '@ast-grep/napi';

import { walk } from '../../parser/parser.js';

export function findThisAccesses(bodyNode: SgNode): string[] {
  const accessed = new Set<string>();
  walk(bodyNode, (node: SgNode) => {
    if (node.kind() === 'member_expression') {
      const children = node.children();
      const obj = children.find((c: SgNode) => c.kind() === 'this');
      const prop = children.find(
        (c: SgNode) => c.kind() === 'property_identifier',
      );
      if (obj && prop) {
        accessed.add(prop.text());
      }
    }
  });
  return [...accessed];
}
