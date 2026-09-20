import { createHash } from 'node:crypto';

import {
  pathForCompare,
  portableResolve,
  readFileIfExistsSync,
} from '@ogham/cross-platform';

import { normalizeSnapshotHashInput } from './normalizeSnapshotHashInput.js';
import { resolveHashFile } from './resolveHashFile.js';
import { stableSerialize } from './stableSerialize.js';

/**
 * Hash the bytes of a set of project files together with supplemental inputs.
 *
 * @param projectRoot Directory every path is resolved and reported against.
 * @param filePaths Paths to hash, absolute or root-relative; duplicates and aliases of one file are folded, and order does not affect the result.
 * @param inputs Values folded in after the files, serialized stably.
 * @param knownBytes Bytes a caller has already read this request, keyed by `pathForCompare(absolutePath)`. A path absent from it is read here, so passing a partial map is safe; passing bytes that are not that file's current content is not, and only a caller that read them for this same snapshot may pass them.
 * @returns The hexadecimal SHA-256 of the framed files and inputs.
 * @throws When a path resolves outside `projectRoot`.
 */
export function computeSnapshotHash(
  projectRoot: string,
  filePaths: readonly string[],
  inputs: readonly unknown[] = [],
  knownBytes?: ReadonlyMap<string, Uint8Array>,
): string {
  const absoluteRoot = portableResolve(projectRoot);
  const uniqueFiles = new Map<string, ReturnType<typeof resolveHashFile>>();
  for (const filePath of filePaths) {
    const file = resolveHashFile(absoluteRoot, filePath);
    const key = pathForCompare(file.absolutePath);
    if (!uniqueFiles.has(key)) uniqueFiles.set(key, file);
  }
  const files = [...uniqueFiles.values()].sort((left, right) =>
    pathForCompare(left.relativePath).localeCompare(
      pathForCompare(right.relativePath),
    ),
  );
  const hash = createHash('sha256');

  for (const file of files) {
    const bytes =
      knownBytes?.get(pathForCompare(file.absolutePath)) ??
      readFileIfExistsSync(file.absolutePath);
    const pathFrame = `file:${file.relativePath.length}:${file.relativePath}:`;
    hash.update(pathFrame);
    if (bytes === null) hash.update('missing');
    else {
      hash.update(`bytes:${bytes.byteLength}:`);
      hash.update(bytes);
    }
  }
  for (const input of inputs) {
    const serialized = stableSerialize(
      normalizeSnapshotHashInput(absoluteRoot, input),
    );
    hash.update(`input:${serialized.length}:${serialized}`);
  }
  return hash.digest('hex');
}
