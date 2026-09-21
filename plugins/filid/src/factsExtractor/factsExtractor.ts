import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

import { VERSION } from '../version.js';

import type {
  FactsProvenance,
  FileFacts,
  FileFactsExtraction,
} from './types/fileFacts.js';
import {
  type ProjectFile,
  resolveProjectFile,
} from './utils/paths/resolveProjectFile.js';
import { extractOneFile } from './utils/records/extractOneFile.js';

/** Name the program records as the producing tool. */
const TOOL_NAME = 'filid-facts';

/**
 * Extract the facts of the requested files of one project.
 *
 * Paths outside the root — by string or through a symbolic link — missing
 * paths and non-files are refused and never read. Accepted files are
 * deduplicated and sorted by project-relative path, so the same tree yields
 * the same records in the same order. A file that cannot be read yields no
 * record and is listed in `unreadable`.
 * @param projectRoot Project root, absolute or relative to the working directory.
 * @param requestedPaths Paths relative to the root, or absolute.
 * @param command Arguments of the run with machine-specific paths normalized;
 *   recorded in every record's provenance.
 * @returns The records, the refused paths and the unreadable files.
 */
export async function extractFileFacts(
  projectRoot: string,
  requestedPaths: readonly string[],
  command: string,
): Promise<FileFactsExtraction> {
  const root = resolve(projectRoot);
  const realRoot = realpathSync.native(root);
  const provenance: FactsProvenance = {
    tool: TOOL_NAME,
    version: VERSION,
    command,
    tier: 'tool',
    resolutionInputs: [],
  };
  const accepted = new Map<string, ProjectFile>();
  const rejected: FileFactsExtraction['rejected'] = [];
  for (const requested of requestedPaths) {
    const file = resolveProjectFile(root, realRoot, requested);
    if ('reason' in file)
      rejected.push({ path: requested, reason: file.reason });
    else accepted.set(file.path, file);
  }
  const records: FileFacts[] = [];
  const unreadable: string[] = [];
  for (const file of [...accepted.values()].sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
  )) {
    const record = await extractOneFile(root, file, provenance);
    if (record) records.push(record);
    else unreadable.push(file.path);
  }
  return { records, rejected, unreadable };
}
