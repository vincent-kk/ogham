/**
 * Extract import/export/call dependencies from source code
 * using @ast-grep/napi (tree-sitter backend).
 *
 * Returns a structured DependencyInfo or an error object when
 * @ast-grep/napi is unavailable.
 */
import type { SgNode } from '@ast-grep/napi';

import { EXT_TO_LANG, getSgLoadError, getSgModule, toLangEnum } from './ast-grep-shared.js';

export interface ImportInfo {
  source: string;
  specifiers: string[];
}

export interface ExportInfo {
  name: string;
  type: string;
}

export interface CallInfo {
  name: string;
  count: number;
}

export interface DependencyInfo {
  imports: ImportInfo[];
  exports: ExportInfo[];
  calls: CallInfo[];
}

export interface DependencyError {
  error: string;
  sgLoadError: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function stripQuotes(s: string): string {
  return s.replace(/^['"`]|['"`]$/g, '');
}

function walk(node: SgNode, fn: (n: SgNode) => void): void {
  fn(node);
  const children = node.children?.();
  if (children) {
    for (const child of children) walk(child, fn);
  }
}

function getCallee(node: SgNode): string | null {
  const kind = node.kind();
  if (kind === 'identifier') return node.text();
  if (kind === 'member_expression') {
    const children = node.children();
    const prop = children.find((c: SgNode) => c.kind() === 'property_identifier');
    if (children[0] && prop) {
      const objName = getCallee(children[0]);
      return objName ? `${objName}.${prop.text()}` : null;
    }
  }
  return null;
}

function extractImports(stmt: SgNode): ImportInfo | null {
  const specifiers: string[] = [];

  walk(stmt, (node: SgNode) => {
    const k = node.kind();
    // named imports: { foo, bar }
    if (k === 'import_specifier') {
      const nameNode = node.children().find((c: SgNode) => c.kind() === 'identifier');
      if (nameNode && !specifiers.includes(nameNode.text())) {
        specifiers.push(nameNode.text());
      }
    }
    // namespace import: * as foo
    if (k === 'namespace_import') {
      const nameNode = node.children().find((c: SgNode) => c.kind() === 'identifier');
      if (nameNode && !specifiers.includes(nameNode.text())) {
        specifiers.push(nameNode.text());
      }
    }
  });

  // default import via import_clause
  const importClause = stmt.children().find((c: SgNode) => c.kind() === 'import_clause');
  if (importClause) {
    const defaultId = importClause.children().find((c: SgNode) => c.kind() === 'identifier');
    if (defaultId && !specifiers.includes(defaultId.text())) {
      specifiers.push(defaultId.text());
    }
  }

  const sourceNode = stmt.children().find((c: SgNode) => c.kind() === 'string');
  if (!sourceNode) return null;

  return { source: stripQuotes(sourceNode.text()), specifiers };
}

function extractExports(stmt: SgNode): ExportInfo[] {
  const results: ExportInfo[] = [];
  const children = stmt.children();

  // export { foo, bar }
  const exportClause = children.find((c: SgNode) => c.kind() === 'export_clause');
  if (exportClause) {
    for (const spec of exportClause.children()) {
      if (spec.kind() === 'export_specifier') {
        const nameNode = spec.children().find((c: SgNode) => c.kind() === 'identifier');
        if (nameNode) results.push({ name: nameNode.text(), type: 'specifier' });
      }
    }
  }

  // export function foo() {}
  const funcDecl = children.find((c: SgNode) => c.kind() === 'function_declaration');
  if (funcDecl) {
    const nameNode = funcDecl.children().find((c: SgNode) => c.kind() === 'identifier');
    if (nameNode) results.push({ name: nameNode.text(), type: 'function' });
  }

  // export class Foo {}
  const classDecl = children.find((c: SgNode) => c.kind() === 'class_declaration');
  if (classDecl) {
    const nameNode = classDecl.children().find((c: SgNode) => c.kind() === 'type_identifier');
    if (nameNode) results.push({ name: nameNode.text(), type: 'class' });
  }

  // export const/let/var foo = ...
  const lexDecl = children.find(
    (c: SgNode) => c.kind() === 'lexical_declaration' || c.kind() === 'variable_declaration',
  );
  if (lexDecl) {
    for (const d of lexDecl.children()) {
      if (d.kind() === 'variable_declarator') {
        const nameNode = d.children().find((c: SgNode) => c.kind() === 'identifier');
        if (nameNode) results.push({ name: nameNode.text(), type: 'const' });
      }
    }
  }

  // export type Foo = ...
  const typeAlias = children.find((c: SgNode) => c.kind() === 'type_alias_declaration');
  if (typeAlias) {
    const nameNode = typeAlias.children().find((c: SgNode) => c.kind() === 'type_identifier');
    if (nameNode) results.push({ name: nameNode.text(), type: 'type' });
  }

  // export interface Foo {}
  const interfaceDecl = children.find((c: SgNode) => c.kind() === 'interface_declaration');
  if (interfaceDecl) {
    const nameNode = interfaceDecl.children().find((c: SgNode) => c.kind() === 'type_identifier');
    if (nameNode) results.push({ name: nameNode.text(), type: 'interface' });
  }

  // export default ...
  const text = stmt.text();
  if (text.includes('export default') && results.length === 0) {
    results.push({ name: 'default', type: 'default' });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract imports, exports, and function call counts from source code.
 *
 * Returns DependencyError when @ast-grep/napi is not available.
 */
export async function extractDependencies(
  source: string,
  filePath = 'anonymous.ts',
): Promise<DependencyInfo | DependencyError> {
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

    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];
    const callCounts = new Map<string, number>();

    for (const stmt of root.children()) {
      const kind = stmt.kind();

      if (kind === 'import_statement') {
        const info = extractImports(stmt);
        if (info) imports.push(info);
      }

      if (kind === 'export_statement') {
        exports.push(...extractExports(stmt));
      }
    }

    // Count call expressions across the full AST
    walk(root, (node: SgNode) => {
      if (node.kind() === 'call_expression') {
        const funcChild = node.children()[0];
        if (funcChild) {
          const callee = getCallee(funcChild);
          if (callee) {
            callCounts.set(callee, (callCounts.get(callee) ?? 0) + 1);
          }
        }
      }
    });

    const calls: CallInfo[] = Array.from(callCounts.entries()).map(([name, count]) => ({
      name,
      count,
    }));

    return { imports, exports, calls };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      sgLoadError: getSgLoadError(),
    };
  }
}
