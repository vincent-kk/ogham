import { dirname } from 'node:path';
import type { DependencyReference, ResolutionAlias } from '../../../types/adapters.js';
import { findHiddenMatches } from '../lexing/findHiddenMatches.js';
import type { ScannedSource } from '../scanSource.js';
import { scanSource } from '../scanSource.js';
import type { LexicalToken } from '../lexing/lexicalToken.js';
import { lineAt } from '../lexing/lineAt.js';
import { matchReExportFrom } from '../entrySurface/matchReExportFrom.js';

import { dependencyStringAfter } from './dependencyStringAfter.js';
import { resolveSpecifier } from './resolveSpecifier.js';

/**
 * Raw-text module references that untrusted literal content may hide.
 *
 * This set is canonical. The server keeps its own copy —
 * `FACTS_REFERENCE_LINE_PATTERNS`, which decides the lines an attested record
 * must explain (spec §4.6) — and that copy has to cover every line these
 * patterns see, or a reference the extractor reports goes unaccounted for.
 * Exported so the parity test can read both and hold them to the same lines;
 * that test is the only consumer outside this file, and it is what keeps the
 * two from drifting.
 */
export const HIDDEN_REFERENCE_PATTERNS: readonly {
  kind: DependencyReference['kind'];
  pattern: RegExp;
}[] = [
  {
    kind: 'static',
    pattern: /(?<![\w$.])from\s*(['"])(?<specifier>[^'"\n]+)\1/g,
  },
  {
    kind: 'dynamic',
    pattern: /(?<![\w$.])import\s*\(\s*(['"])(?<specifier>[^'"\n]+)\1/g,
  },
  {
    kind: 'static',
    pattern: /(?<![\w$.])import\s+(['"])(?<specifier>[^'"\n]+)\1/g,
  },
  {
    kind: 'static',
    pattern: /(?<![\w$.])require\s*\(\s*(['"])(?<specifier>[^'"\n]+)\1/g,
  },
];

/**
 * Distinguish unmatched non-local references from matched paths that are missing.
 * @param specifier Reference text to classify.
 * @param aliases Validated project substitutions.
 * @returns Whether the reference is external to the substitution list.
 */
function isExternalSpecifier(specifier: string, aliases: readonly ResolutionAlias[]): boolean {
  return !specifier.startsWith('.') && !specifier.startsWith('/') &&
    !aliases.some((alias) => alias.from.endsWith('*')
      ? specifier.startsWith(alias.from.slice(0, -1))
      : specifier === alias.from);
}

/**
 * Extract local, substituted and external references of one source text.
 *
 * On a line an unterminated `'` or `"` mispaired, everything after the first
 * quote is untrusted: references the scan read as code there are
 * `indeterminate`, and references hidden in its text — or in an unterminated
 * template — are found as raw text and reported `indeterminate` once. References
 * after the point where the scanner lost track are `indeterminate` too,
 * because the boundaries that placed them can no longer be trusted.
 * @param filePath - File the text belongs to; specifiers resolve against it
 * @param source - The file's text
 * @param scanned - The scan of that text, when the caller already took one;
 * omitted, this reading takes its own.
 * @param aliases Validated project substitution list.
 * @param projectRoot Root for alias targets; local references remain source-relative.
 * @returns References the scan read as code, in source order, then the hidden ones
 */
export function referencesInSource(
  filePath: string,
  source: string,
  scanned?: ScannedSource,
  aliases: readonly ResolutionAlias[] = [],
  projectRoot: string = dirname(filePath),
): DependencyReference[] {
  const { tokens, untrusted } = scanned ?? scanSource(source);
  const references: DependencyReference[] = [];
  let lineIndex = 0;

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

    while (
      lineIndex < untrusted.lines.length &&
      untrusted.lines[lineIndex].end < token.start
    )
      lineIndex += 1;
    const line = untrusted.lines[lineIndex];
    const afterFirstQuote =
      line !== undefined &&
      line.literals.length > 0 &&
      token.start > line.literals[0].start;
    const indeterminate =
      afterFirstQuote || token.start > untrusted.lostTrackAt;
    const written = source.slice(dependency.start, dependency.end);
    references.push({
      sourceFile: filePath,
      rawSpecifier: dependency.value,
      ...(written === `${written[0]}${dependency.value}${written[0]}`
        ? {}
        : { sourceText: written }),
      resolvedPath: resolveSpecifier(filePath, dependency.value, aliases, projectRoot),
      ...(isExternalSpecifier(dependency.value, aliases) ? { external: dependency.value } : {}),
      kind,
      ...(indeterminate
        ? {
            certainty: 'indeterminate' as const,
            line: lineAt(source, token.start),
          }
        : {}),
    });
  }

  for (const { kind, pattern } of HIDDEN_REFERENCE_PATTERNS)
    for (const hit of findHiddenMatches(
      source,
      untrusted,
      pattern,
      'afterFirstQuote',
    )) {
      const specifier = hit.groups?.specifier;
      if (!specifier) continue;
      if (
        references.some(
          (reference) =>
            reference.rawSpecifier === specifier &&
            reference.certainty === 'indeterminate',
        )
      )
        continue;
      references.push({
        sourceFile: filePath,
        rawSpecifier: specifier,
        resolvedPath: resolveSpecifier(filePath, specifier, aliases, projectRoot),
        ...(isExternalSpecifier(specifier, aliases) ? { external: specifier } : {}),
        kind,
        certainty: 'indeterminate',
        line: lineAt(source, hit.offset),
      });
    }
  return references;
}
