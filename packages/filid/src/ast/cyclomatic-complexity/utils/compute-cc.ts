import type { SgNode } from '@ast-grep/napi';

import { DECISION_KINDS } from '../../../constants/decision-points.js';
import { walk } from '../../parser/parser.js';

export function computeCC(bodyNode: SgNode): number {
  let cc = 1;
  walk(bodyNode, (node: SgNode) => {
    const kind = node.kind();

    if (DECISION_KINDS.has(kind)) {
      cc++;
      return;
    }

    // switch_case: only non-default cases (those with a test expression)
    if (kind === 'switch_case') {
      // A default case in tree-sitter has kind 'switch_default'
      // switch_case always has a condition
      cc++;
      return;
    }

    // switch_default is separate, don't count it
    // (tree-sitter separates switch_case and switch_default)

    // Logical && and || operators
    if (kind === 'binary_expression') {
      const children = node.children();
      for (const child of children) {
        const text = child.text();
        if (text === '&&' || text === '||') {
          cc++;
          break;
        }
      }
    }
  });
  return cc;
}
