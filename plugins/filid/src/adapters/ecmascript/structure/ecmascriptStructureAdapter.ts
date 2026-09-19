import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import type {
  EntryPointInspection,
  StructureAdapter,
} from '../../../types/adapters.js';

import { walkSourceTree } from './discovery/walkSourceTree.js';
import { ECMASCRIPT_ADAPTER_ID } from './ecmascriptConventions.js';
import { hidesExport } from './entrySurface/hidesExport.js';
import { extractDependencyReferences } from './extractDependencyReferences.js';
import { findEntryPoints } from './findEntryPoints.js';
import { inspectManifestEntry } from './inspectManifestEntry.js';
import { scanLexicalTokens } from './scanLexicalTokens.js';

function inspectEntryPointSource(
  entryPointPath: string,
): Omit<EntryPointInspection, 'entryPoint'> {
  const source = readFileSync(entryPointPath, 'utf8');
  const tokens = scanLexicalTokens(source);
  const exportedNames = new Set<string>();
  let hasDirectDeclarations = false;
  let certainty: EntryPointInspection['certainty'] = 'exact';
  const declarationKeywords = new Set([
    'class',
    'const',
    'enum',
    'function',
    'interface',
    'let',
    'type',
    'var',
  ]);

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (
      token.braceDepth === 0 &&
      token.kind === 'identifier' &&
      declarationKeywords.has(token.value)
    )
      hasDirectDeclarations = true;
    if (token.kind !== 'identifier' || token.value !== 'export') continue;
    const next = tokens[index + 1];
    if (!next) {
      certainty = 'indeterminate';
      continue;
    }
    if (next.value === 'default') {
      exportedNames.add('default');
      continue;
    }
    if (next.value === '*') {
      certainty = 'indeterminate';
      continue;
    }
    if (next.value === '{') {
      for (let cursor = index + 2; cursor < tokens.length; cursor += 1) {
        const candidate = tokens[cursor];
        if (candidate.value === '}') break;
        if (candidate.kind !== 'identifier' || candidate.value === 'as')
          continue;
        const alias =
          tokens[cursor + 1]?.value === 'as' ? tokens[cursor + 2] : null;
        exportedNames.add(
          alias?.kind === 'identifier' ? alias.value : candidate.value,
        );
      }
      continue;
    }
    if (declarationKeywords.has(next.value)) {
      const name = tokens
        .slice(index + 2)
        .find((candidate) => candidate.kind === 'identifier');
      if (name) exportedNames.add(name.value);
      else certainty = 'indeterminate';
    }
  }

  if (hidesExport(source, tokens)) certainty = 'indeterminate';
  return {
    exportedNames: [...exportedNames].sort(),
    hasDirectDeclarations,
    certainty,
  };
}

export const ecmascriptStructureAdapter: StructureAdapter = {
  id: ECMASCRIPT_ADAPTER_ID,
  async detect(projectRoot) {
    const evidence: string[] = [];
    for (const filename of ['package.json', 'tsconfig.json', 'jsconfig.json'])
      if (existsSync(join(projectRoot, filename))) evidence.push(filename);
    const { files } = walkSourceTree(projectRoot);
    if (files.length > 0)
      evidence.push(
        ...files.slice(0, 3).map((path) => path.slice(projectRoot.length + 1)),
      );
    return {
      confidence:
        evidence.length === 0 ? 0 : evidence[0] === 'package.json' ? 1 : 0.8,
      evidence,
    };
  },
  async discoverSourceFiles(projectRoot) {
    return walkSourceTree(projectRoot).files;
  },
  async discoverSourceTree(projectRoot) {
    return walkSourceTree(projectRoot);
  },
  async findEntryPoints(directoryPath, overrides) {
    return findEntryPoints(directoryPath, overrides);
  },
  async inspectEntryPoint(entryPointPath) {
    const entryPoint = (await findEntryPoints(dirname(entryPointPath))).find(
      ({ path }) => path === entryPointPath,
    ) ?? {
      path: entryPointPath,
      kind: 'module',
      adapterId: ECMASCRIPT_ADAPTER_ID,
      surface: 'enumerated',
    };
    if (entryPoint.kind === 'manifest')
      return { entryPoint, ...inspectManifestEntry(entryPointPath) };
    return { entryPoint, ...inspectEntryPointSource(entryPointPath) };
  },
  async extractDependencies(filePath) {
    return extractDependencyReferences(filePath);
  },
  async isFrameworkOwnedPeer(filePath) {
    return (await findEntryPoints(dirname(filePath))).some(
      (entryPoint) =>
        entryPoint.kind === 'framework' &&
        basename(entryPoint.path) === basename(filePath),
    );
  },
  async suggestEntryPointPath(directoryPath) {
    return join(directoryPath, 'index.ts');
  },
};

export { ECMASCRIPT_ADAPTER_ID };
