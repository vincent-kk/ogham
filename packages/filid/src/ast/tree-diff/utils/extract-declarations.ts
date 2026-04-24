import { parseSource } from '../../parser/parser.js';
import { getNameFromNode } from './get-name-from-node.js';

export interface DeclSignature {
  name: string;
  kind: string;
  normalized: string;
  line: number;
}

export async function extractDeclarations(source: string): Promise<DeclSignature[]> {
  const root = await parseSource(source);
  const decls: DeclSignature[] = [];
  const rootChildren = root.children();

  for (const stmt of rootChildren) {
    const kind = stmt.kind();
    const line = stmt.range().start.line + 1;
    const normalized = stmt.text().replace(/\s+/g, '');

    if (kind === 'function_declaration') {
      const name = getNameFromNode(stmt, 'identifier');
      if (name) decls.push({ name, kind: 'function', normalized, line });
    } else if (kind === 'class_declaration') {
      const name = getNameFromNode(stmt, 'type_identifier');
      if (name) decls.push({ name, kind: 'class', normalized, line });
    } else if (
      kind === 'lexical_declaration' ||
      kind === 'variable_declaration'
    ) {
      for (const d of stmt.children()) {
        if (d.kind() === 'variable_declarator') {
          const name = getNameFromNode(d, 'identifier');
          if (name) decls.push({ name, kind: 'variable', normalized, line });
        }
      }
    } else if (kind === 'interface_declaration') {
      const name = getNameFromNode(stmt, 'type_identifier');
      if (name) decls.push({ name, kind: 'interface', normalized, line });
    } else if (kind === 'type_alias_declaration') {
      const name = getNameFromNode(stmt, 'type_identifier');
      if (name) decls.push({ name, kind: 'type', normalized, line });
    } else if (kind === 'export_statement') {
      // Unwrap export to get the actual declaration
      const children = stmt.children();
      for (const child of children) {
        const ck = child.kind();
        const childNorm = stmt.text().replace(/\s+/g, '');

        if (ck === 'function_declaration') {
          const name = getNameFromNode(child, 'identifier');
          if (name)
            decls.push({
              name,
              kind: 'function',
              normalized: childNorm,
              line,
            });
        } else if (ck === 'class_declaration') {
          const name = getNameFromNode(child, 'type_identifier');
          if (name)
            decls.push({ name, kind: 'class', normalized: childNorm, line });
        } else if (
          ck === 'lexical_declaration' ||
          ck === 'variable_declaration'
        ) {
          for (const d of child.children()) {
            if (d.kind() === 'variable_declarator') {
              const name = getNameFromNode(d, 'identifier');
              if (name)
                decls.push({
                  name,
                  kind: 'variable',
                  normalized: childNorm,
                  line,
                });
            }
          }
        } else if (ck === 'interface_declaration') {
          const name = getNameFromNode(child, 'type_identifier');
          if (name)
            decls.push({
              name,
              kind: 'interface',
              normalized: childNorm,
              line,
            });
        } else if (ck === 'type_alias_declaration') {
          const name = getNameFromNode(child, 'type_identifier');
          if (name)
            decls.push({ name, kind: 'type', normalized: childNorm, line });
        }
      }
    }
  }

  return decls;
}
