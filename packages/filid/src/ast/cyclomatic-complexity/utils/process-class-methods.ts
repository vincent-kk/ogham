import type { SgNode } from '@ast-grep/napi';

import { computeCC } from './compute-cc.js';

export function processClassMethods(
  classNode: SgNode,
  perFunction: Map<string, number>,
): void {
  const classBody = classNode
    .children()
    .find((c: SgNode) => c.kind() === 'class_body');
  if (!classBody) return;

  for (const member of classBody.children()) {
    if (member.kind() === 'method_definition') {
      const nameNode = member
        .children()
        .find((c: SgNode) => c.kind() === 'property_identifier');
      const body = member
        .children()
        .find((c: SgNode) => c.kind() === 'statement_block');
      if (nameNode && body) {
        perFunction.set(nameNode.text(), computeCC(body));
      }
    }
  }
}
