import {
  checkDeclaredInputs,
  classifyFactsFile,
  createDeclaredInputHasher,
  hashProjectFile,
} from '../../../../../core/facts/index.js';
import type { FactsFileState } from '../../../../../core/facts/index.js';

import type { FactsContext } from './buildFactsContext.js';

/**
 * Decide the facts state of every scanned file.
 *
 * Both filesystem reads are conditional on there being a record to bind: a file
 * with no record is `missing` whatever its bytes say, so hashing it would cost a
 * read per file on a project that has never submitted anything. Declared inputs
 * are hashed through one per-call memo, because a whole-repository store names
 * the same handful of manifests thousands of times.
 *
 * Which files hold open items is passed in rather than read here, because the
 * answer has to be the same one the response lists: a file is `uncertain`
 * exactly when the caller was handed something to judge for it.
 *
 * @param projectRoot - Absolute project root, used as given.
 * @param context - Scope, scanned paths, records and epoch for this call.
 * @param open - Paths the caller is being offered an open item for.
 * @returns Each scanned path mapped to its state.
 */
export function classifyScannedFiles(
  projectRoot: string,
  context: FactsContext,
  open: ReadonlySet<string>,
): Map<string, FactsFileState> {
  const hashDeclaredInput = createDeclaredInputHasher(projectRoot);
  const states = new Map<string, FactsFileState>();
  for (const path of context.scannedPaths) {
    const record = context.records.get(path)?.record ?? null;
    const current = record === null ? null : hashProjectFile(projectRoot, path);
    const syntaxValid =
      record !== null &&
      current !== null &&
      current.ok &&
      current.contentHash === record.facts.contentHash;
    states.set(
      path,
      classifyFactsFile(
        {
          path,
          inScope: context.scope.covers(path),
          record,
          syntaxValid,
          resolutionInputsValid:
            record === null ||
            checkDeclaredInputs(record.facts.provenance, hashDeclaredInput).ok,
          hasOpenItems: open.has(path),
        },
        context.epoch.resolutionEpoch,
      ),
    );
  }
  return states;
}
