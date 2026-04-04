/**
 * Cyclomatic Complexity (CC) calculator using @ast-grep/napi.
 *
 * CC = 1 (base) + decision points per function.
 * Decision points: if, else if, for, while, do-while, switch case,
 * catch, &&, ||, ternary (?:).
 *
 * Returns CyclomaticResult or an error object when @ast-grep/napi is unavailable.
 */
import type { SgNode } from '@ast-grep/napi';

import { EXT_TO_LANG, getSgLoadError, getSgModule, toLangEnum } from './ast-grep-shared.js';

export interface CyclomaticResult {
  /** Max CC across all functions in the file */
  value: number;
  /** Sum of all per-function CC values */
  fileTotal: number;
  /** Function name → CC value */
  perFunction: Record<string, number>;
}

export interface CyclomaticError {
  error: string;
  sgLoadError: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Decision-point node kinds that unconditionally add +1 to CC */
const DECISION_KINDS = new Set([
  'if_statement',
  'for_statement',
  'for_in_statement',
  'while_statement',
  'do_statement',
  'ternary_expression',
  'catch_clause',
]);

function walk(node: SgNode, fn: (n: SgNode) => void): void {
  fn(node);
  const children = node.children?.();
  if (children) {
    for (const child of children) walk(child, fn);
  }
}

function computeCC(bodyNode: SgNode): number {
  let cc = 1;
  walk(bodyNode, (node: SgNode) => {
    const kind = node.kind();

    if (DECISION_KINDS.has(kind)) {
      cc++;
      return;
    }

    // switch_case (non-default) adds +1; switch_default does not
    if (kind === 'switch_case') {
      cc++;
      return;
    }

    // Logical && and || each add +1
    if (kind === 'binary_expression') {
      for (const child of node.children()) {
        const t = child.text();
        if (t === '&&' || t === '||') {
          cc++;
          break;
        }
      }
    }
  });
  return cc;
}

function getFunctionName(node: SgNode): string | null {
  const children = node.children();
  const nameNode = children.find(
    (c: SgNode) => c.kind() === 'identifier' || c.kind() === 'property_identifier',
  );
  return nameNode ? nameNode.text() : null;
}

function processFunction(
  node: SgNode,
  name: string,
  perFunction: Map<string, number>,
): void {
  const body = node.children().find((c: SgNode) => c.kind() === 'statement_block');
  if (body) {
    perFunction.set(name, computeCC(body));
  }
}

function processClassMethods(classNode: SgNode, perFunction: Map<string, number>): void {
  const classBody = classNode.children().find((c: SgNode) => c.kind() === 'class_body');
  if (!classBody) return;
  for (const member of classBody.children()) {
    if (member.kind() === 'method_definition') {
      const nameNode = member
        .children()
        .find((c: SgNode) => c.kind() === 'property_identifier');
      const body = member.children().find((c: SgNode) => c.kind() === 'statement_block');
      if (nameNode && body) {
        perFunction.set(nameNode.text(), computeCC(body));
      }
    }
  }
}

function processLexicalDecl(
  lexDecl: SgNode,
  perFunction: Map<string, number>,
): void {
  for (const decl of lexDecl.children()) {
    if (decl.kind() === 'variable_declarator') {
      const nameNode = decl.children().find((c: SgNode) => c.kind() === 'identifier');
      const init = decl
        .children()
        .find(
          (c: SgNode) =>
            c.kind() === 'arrow_function' || c.kind() === 'function_expression',
        );
      if (nameNode && init) {
        processFunction(init, nameNode.text(), perFunction);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate cyclomatic complexity for all functions in the given source.
 *
 * Returns CyclomaticError when @ast-grep/napi is not available.
 */
export async function calculateComplexity(
  source: string,
  filePath = 'anonymous.ts',
): Promise<CyclomaticResult | CyclomaticError> {
  const sg = await getSgModule();
  if (!sg) {
    return {
      error: '@ast-grep/napi is not available. Install it with: npm install -g @ast-grep/napi',
      sgLoadError: getSgLoadError(),
    };
  }

  try {
    const ext = filePath.includes('.') ? '.' + filePath.split('.').pop() : '.ts';
    const langStr = EXT_TO_LANG[ext] ?? 'typescript';
    const lang = toLangEnum(sg, langStr);
    const root = sg.parse(lang as never, source).root();

    const perFunction = new Map<string, number>();

    for (const stmt of root.children()) {
      const kind = stmt.kind();

      // function foo() {}
      if (kind === 'function_declaration') {
        const name = getFunctionName(stmt);
        if (name) processFunction(stmt, name, perFunction);
      }

      // const foo = () => {} or const foo = function() {}
      if (kind === 'lexical_declaration' || kind === 'variable_declaration') {
        processLexicalDecl(stmt, perFunction);
      }

      // export function foo() {} / export class Foo {} / export const foo = () => {}
      if (kind === 'export_statement') {
        const children = stmt.children();

        const funcDecl = children.find((c: SgNode) => c.kind() === 'function_declaration');
        if (funcDecl) {
          const name = getFunctionName(funcDecl);
          if (name) processFunction(funcDecl, name, perFunction);
        }

        const classDecl = children.find((c: SgNode) => c.kind() === 'class_declaration');
        if (classDecl) processClassMethods(classDecl, perFunction);

        const lexDecl = children.find(
          (c: SgNode) =>
            c.kind() === 'lexical_declaration' || c.kind() === 'variable_declaration',
        );
        if (lexDecl) processLexicalDecl(lexDecl, perFunction);
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
    let value = 0;
    for (const cc of perFunction.values()) {
      fileTotal += cc;
      if (cc > value) value = cc;
    }

    const perFunctionRecord: Record<string, number> = {};
    for (const [name, cc] of perFunction) {
      perFunctionRecord[name] = cc;
    }

    return { value, fileTotal, perFunction: perFunctionRecord };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      sgLoadError: getSgLoadError(),
    };
  }
}
