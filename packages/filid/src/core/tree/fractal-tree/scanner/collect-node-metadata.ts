import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import type { ScanOptions } from '../../../../types/scan.js';
import { classifyNode } from '../../organ-classifier/organ-classifier.js';
import type { NodeEntry } from '../tree-builder/build-fractal-tree.js';

/**
 * Build immediate-children map and collect NodeEntry metadata for every directory.
 */
export function collectNodeMetadata(
  allDirs: string[],
  rootPath: string,
  opts: Required<ScanOptions>,
  frameworkReservedArr: string[],
): { nodeEntries: NodeEntry[]; childrenMap: Map<string, string[]> } {
  const dirSet = new Set(allDirs);

  // Pre-compute immediate children map: O(n) instead of O(n²) per-entry lookups
  const childrenMap = new Map<string, string[]>();
  for (const absPath of allDirs) {
    childrenMap.set(absPath, []);
  }
  for (const absPath of allDirs) {
    const parentDir = dirname(absPath);
    if (parentDir && childrenMap.has(parentDir)) {
      childrenMap.get(parentDir)!.push(absPath);
    }
  }

  const nodeEntries: NodeEntry[] = [];
  const maxDepth = opts.maxDepth;

  for (const absPath of allDirs) {
    const rel = relative(rootPath, absPath);
    const depth = rel === '' ? 0 : rel.split('/').length;
    if (depth > maxDepth) continue;

    const name =
      absPath === rootPath
        ? (rootPath.split('/').pop() ?? '')
        : (absPath.split('/').pop() ?? '');
    const hasIntentMd = existsSync(join(absPath, 'INTENT.md'));
    const hasDetailMd = existsSync(join(absPath, 'DETAIL.md'));
    const hasIndex =
      existsSync(join(absPath, 'index.ts')) ||
      existsSync(join(absPath, 'index.tsx')) ||
      existsSync(join(absPath, 'index.js')) ||
      existsSync(join(absPath, 'index.mjs')) ||
      existsSync(join(absPath, 'index.cjs'));
    const hasMain =
      existsSync(join(absPath, 'main.ts')) ||
      existsSync(join(absPath, 'main.js'));

    // Enumerate peer files (non-directory, non-dot-file entries)
    const dirEntries = readdirSync(absPath, { withFileTypes: true });
    const peerFiles = dirEntries
      .filter((e) => e.isFile() && !e.name.startsWith('.'))
      .map((e) => e.name);

    // Detect eponymous file (dirname === filename sans extension, max 1)
    const eponymousFile =
      peerFiles.find((f) => f.replace(/\.[^.]+$/, '') === name) ?? null;

    const children = childrenMap.get(absPath) ?? [];
    const hasFractalChildren = children.some((d) => dirSet.has(d));
    const isLeafDirectory = children.length === 0;

    const type = classifyNode({
      dirName: name,
      hasIntentMd,
      hasDetailMd,
      hasFractalChildren,
      isLeafDirectory,
      hasIndex,
    });

    nodeEntries.push({
      path: absPath,
      name,
      type,
      hasIntentMd,
      hasDetailMd,
      hasIndex,
      hasMain,
      peerFiles,
      eponymousFile,
      frameworkReservedFiles: frameworkReservedArr,
    });
  }

  return { nodeEntries, childrenMap };
}
