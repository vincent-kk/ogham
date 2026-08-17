import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

import type { DependencyReference } from '../../../types/adapters.js';

import { SOURCE_EXTENSIONS } from './ecmascriptConventions.js';
import { matchReExportFrom } from './matchReExportFrom.js';
import { type LexicalToken, scanLexicalTokens } from './scanLexicalTokens.js';

function resolveSpecifier(
  sourceFile: string,
  specifier: string,
): string | null {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return null;
  const unresolved = resolve(dirname(sourceFile), specifier);
  const extension = extname(unresolved);
  const base = extension ? unresolved.slice(0, -extension.length) : unresolved;
  const candidates = [
    unresolved,
    ...SOURCE_EXTENSIONS.map((candidate) => base + candidate),
    ...SOURCE_EXTENSIONS.map((candidate) =>
      join(unresolved, `index${candidate}`),
    ),
  ];
  for (const candidate of candidates)
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return null;
}

function dependencyStringAfter(
  tokens: readonly LexicalToken[],
  start: number,
): LexicalToken | null {
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === 'string') return token;
    if (
      token.value === ';' ||
      (token.braceDepth === 0 &&
        token.kind === 'identifier' &&
        (token.value === 'import' || token.value === 'export'))
    )
      return null;
  }
  return null;
}

export function extractDependencyReferences(
  filePath: string,
): DependencyReference[] {
  const tokens = scanLexicalTokens(readFileSync(filePath, 'utf8'));
  const references: DependencyReference[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    let kind: DependencyReference['kind'] | null = null;
    let dependency: LexicalToken | null = null;
    if (token.kind === 'identifier' && token.value === 'import') {
      const next = tokens[index + 1]?.value;
      // `import.meta` is a meta-property, not a declaration. Without this the
      // next string literal in expressions like
      // `dirname(fileURLToPath(import.meta.url)) + '/../..'` is read as a
      // specifier, and the unresolvable result turns the whole graph
      // indeterminate.
      if (next === '.') continue;
      kind = next === '(' ? 'dynamic' : 'static';
      dependency = dependencyStringAfter(tokens, index + 1);
    } else if (token.kind === 'identifier' && token.value === 'export') {
      const fromIndex = matchReExportFrom(tokens, index);
      if (fromIndex >= 0) {
        kind = 're-export';
        dependency = dependencyStringAfter(tokens, fromIndex + 1);
      }
    } else if (token.kind === 'identifier' && token.value === 'require') {
      kind = 'static';
      dependency = dependencyStringAfter(tokens, index + 1);
    }
    if (!kind || !dependency) continue;
    if (!dependency.value.startsWith('.') && !dependency.value.startsWith('/'))
      continue;

    references.push({
      sourceFile: filePath,
      rawSpecifier: dependency.value,
      resolvedPath: resolveSpecifier(filePath, dependency.value),
      kind,
    });
  }

  return references;
}
