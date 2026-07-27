import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

import type {
  EntryPointInspection,
  StructureAdapter,
} from '../../../types/adapters.js';

import {
  ECMASCRIPT_ADAPTER_ID,
  EXCLUDED_DIRECTORY_NAMES,
  SOURCE_EXTENSIONS,
} from './ecmascriptConventions.js';
import { extractDependencyReferences } from './extractDependencyReferences.js';
import { findEntryPoints } from './findEntryPoints.js';
import { scanLexicalTokens } from './scanLexicalTokens.js';

function discoverEcmascriptFiles(projectRoot: string): string[] {
  const files: string[] = [];
  const visit = (directoryPath: string): void => {
    const entries = readdirSync(directoryPath, { withFileTypes: true }).sort(
      (left, right) => left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      const path = join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORY_NAMES.has(entry.name)) visit(path);
        continue;
      }
      if (
        entry.isFile() &&
        SOURCE_EXTENSIONS.includes(
          extname(entry.name) as (typeof SOURCE_EXTENSIONS)[number],
        )
      )
        files.push(path);
    }
  };
  visit(projectRoot);
  return files;
}

function inspectEntryPointSource(
  entryPointPath: string,
): Omit<EntryPointInspection, 'entryPoint'> {
  const tokens = scanLexicalTokens(readFileSync(entryPointPath, 'utf8'));
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
    const files = discoverEcmascriptFiles(projectRoot);
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
    return discoverEcmascriptFiles(projectRoot);
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
