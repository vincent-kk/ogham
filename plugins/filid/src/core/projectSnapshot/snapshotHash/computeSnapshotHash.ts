import { createHash } from 'node:crypto';

import { readFileIfExistsSync } from '@ogham/cross-platform/filesystem/read/bytes';
import { pathForCompare, portableResolve } from '@ogham/cross-platform/paths';

import { normalizeSnapshotHashInput } from './normalizeSnapshotHashInput.js';
import { resolveHashFile } from './resolveHashFile.js';
import { stableSerialize } from './stableSerialize.js';

export function computeSnapshotHash(
  projectRoot: string,
  filePaths: readonly string[],
  inputs: readonly unknown[] = [],
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
    const bytes = readFileIfExistsSync(file.absolutePath);
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
