/**
 * Cyclomatic Complexity (CC) calculator using @ast-grep/napi.
 *
 * CC = 1 (base) + number of decision points per function.
 * Decision points: if, for, while, do-while, case (non-default),
 * conditional (?:), && and ||.
 */
import type { SgNode } from '@ast-grep/napi';

import type { CyclomaticComplexityResult } from '../../types/metrics.js';

import { parseSource } from '../parser/parser.js';
import { computeCC } from './utils/compute-cc.js';
import { getNodeName } from './utils/get-node-name.js';
import { processClassMethods } from './utils/process-class-methods.js';

export async function calculateCC(
  source: string,
  _filePath = 'analysis.ts',
): Promise<CyclomaticComplexityResult> {
  const root = await parseSource(source);
  const perFunction = new Map<string, number>();
  const rootChildren = root.children();

  for (const stmt of rootChildren) {
    const kind = stmt.kind();

    // function foo() {}
    if (kind === 'function_declaration') {
      const name = getNodeName(stmt);
      const body = stmt
        .children()
        .find((c: SgNode) => c.kind() === 'statement_block');
      if (name && body) {
        perFunction.set(name, computeCC(body));
      }
    }

    // const foo = () => {} or const foo = function() {}
    if (kind === 'lexical_declaration' || kind === 'variable_declaration') {
      for (const decl of stmt.children()) {
        if (decl.kind() === 'variable_declarator') {
          const nameNode = decl
            .children()
            .find((c: SgNode) => c.kind() === 'identifier');
          const initChildren = decl.children();
          const init = initChildren.find(
            (c: SgNode) =>
              c.kind() === 'arrow_function' ||
              c.kind() === 'function_expression',
          );
          if (nameNode && init) {
            const body = init
              .children()
              .find((c: SgNode) => c.kind() === 'statement_block');
            if (body) {
              perFunction.set(nameNode.text(), computeCC(body));
            }
          }
        }
      }
    }

    // export function foo() {} or export class Foo {}
    if (kind === 'export_statement') {
      const exportedDecl = stmt.children();

      const funcDecl = exportedDecl.find(
        (c: SgNode) => c.kind() === 'function_declaration',
      );
      if (funcDecl) {
        const name = getNodeName(funcDecl);
        const body = funcDecl
          .children()
          .find((c: SgNode) => c.kind() === 'statement_block');
        if (name && body) {
          perFunction.set(name, computeCC(body));
        }
      }

      // export class Foo { method() {} }
      const classDecl = exportedDecl.find(
        (c: SgNode) => c.kind() === 'class_declaration',
      );
      if (classDecl) {
        processClassMethods(classDecl, perFunction);
      }

      // export const foo = () => {}
      const lexDecl = exportedDecl.find(
        (c: SgNode) =>
          c.kind() === 'lexical_declaration' ||
          c.kind() === 'variable_declaration',
      );
      if (lexDecl) {
        for (const decl of lexDecl.children()) {
          if (decl.kind() === 'variable_declarator') {
            const nameNode = decl
              .children()
              .find((c: SgNode) => c.kind() === 'identifier');
            const init = decl
              .children()
              .find(
                (c: SgNode) =>
                  c.kind() === 'arrow_function' ||
                  c.kind() === 'function_expression',
              );
            if (nameNode && init) {
              const body = init
                .children()
                .find((c: SgNode) => c.kind() === 'statement_block');
              if (body) {
                perFunction.set(nameNode.text(), computeCC(body));
              }
            }
          }
        }
      }
    }

    // class Foo { method() {} }
    if (kind === 'class_declaration') {
      processClassMethods(stmt, perFunction);
    }
  }

  if (perFunction.size === 0) {
    perFunction.set('(file)', 1);
  }

  let fileTotal = 0;
  for (const cc of perFunction.values()) fileTotal += cc;

  return { value: fileTotal, perFunction, fileTotal };
}
