import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import type { StructureAdapter } from '../../../types/adapters.js';

import { walkSourceTree } from './discovery/walkSourceTree.js';
import { ECMASCRIPT_ADAPTER_ID } from './ecmascriptConventions.js';
import { findEntryPoints } from './findEntryPoints.js';
import { inspectEntryPointSurface } from './inspectEntryPointSurface.js';

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
    return inspectEntryPointSurface(entryPointPath);
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
