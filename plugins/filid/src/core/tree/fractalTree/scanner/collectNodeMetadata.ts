import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

import { pathForCompare } from '@ogham/cross-platform/paths';

import { DETAIL_MD, INTENT_MD } from '../../../../constants/documentFiles.js';
import type { StructureAdapter } from '../../../../types/adapters.js';
import type { ScanOptions } from '../../../../types/scan.js';
import { classifyNode } from '../../organClassifier/index.js';
import type { NodeEntry } from '../treeBuilder/buildFractalTree.js';

export async function collectNodeMetadata(
  allDirs: string[],
  rootPath: string,
  opts: Required<ScanOptions>,
  adapters: readonly StructureAdapter[],
): Promise<{ nodeEntries: NodeEntry[]; childrenMap: Map<string, string[]> }> {
  const childrenMap = new Map<string, string[]>(
    allDirs.map((path) => [path, []]),
  );
  for (const path of allDirs) {
    const parentPath = dirname(path);
    childrenMap.get(parentPath)?.push(path);
  }

  const nodeEntries = await Promise.all(
    allDirs.map(async (path): Promise<NodeEntry | null> => {
      const relativePath = relative(rootPath, path);
      const depth =
        relativePath === '' ? 0 : relativePath.split(/[\\/]/).length;
      if (depth > opts.maxDepth) return null;
      const name = path === rootPath ? basename(rootPath) : basename(path);
      const hasIntentMd = existsSync(join(path, INTENT_MD));
      const hasDetailMd = existsSync(join(path, DETAIL_MD));
      const peerFiles = readdirSync(path, { withFileTypes: true })
        .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
        .map((entry) => entry.name)
        .sort();
      const entryPoints = (
        await Promise.all(
          adapters.map((adapter) =>
            adapter.findEntryPoints(
              path,
              opts.entryPointOverrides?.[adapter.id],
            ),
          ),
        )
      )
        .flat()
        .filter(
          (entryPoint) =>
            !opts.enforceStructureOwnership ||
            opts.structureOwnership.get(pathForCompare(entryPoint.path)) ===
              entryPoint.adapterId,
        )
        .filter(
          (entryPoint, index, entries) =>
            entries.findIndex(
              (candidate) =>
                pathForCompare(candidate.path) ===
                  pathForCompare(entryPoint.path) &&
                candidate.adapterId === entryPoint.adapterId,
            ) === index,
        )
        .sort((left, right) => left.path.localeCompare(right.path));
      const frameworkReservedFiles: string[] = [];
      for (const peerFile of peerFiles) {
        const absolutePeerPath = join(path, peerFile);
        if (
          (
            await Promise.all(
              adapters.map((adapter) =>
                adapter.isFrameworkOwnedPeer(absolutePeerPath),
              ),
            )
          ).some(Boolean)
        )
          frameworkReservedFiles.push(peerFile);
      }
      const children = childrenMap.get(path) ?? [];
      return {
        path,
        name,
        type: classifyNode({
          dirName: name,
          hasIntentMd,
          hasDetailMd,
          hasFractalChildren: children.length > 0,
          isLeafDirectory: children.length === 0,
          entryPoints,
          additionalOrganNames: opts.additionalOrganNames,
        }),
        hasIntentMd,
        hasDetailMd,
        entryPoints,
        peerFiles,
        eponymousFile:
          peerFiles.find((file) => file.replace(/\.[^.]+$/, '') === name) ??
          null,
        frameworkReservedFiles,
        hasIndex: entryPoints.some(
          (entryPoint) => entryPoint.kind === 'module',
        ),
        hasMain: entryPoints.some(
          (entryPoint) => entryPoint.kind === 'executable',
        ),
      };
    }),
  );

  return {
    nodeEntries: nodeEntries.filter(
      (entry): entry is NodeEntry => entry !== null,
    ),
    childrenMap,
  };
}
