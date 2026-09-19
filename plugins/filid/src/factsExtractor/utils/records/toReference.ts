import type { DependencyReference } from '../../../types/adapters.js';
import type { Reference } from '../../types/fileFacts.js';
import { isInsideRoot } from '../paths/isInsideRoot.js';
import { toPosixRelative } from '../paths/toPosixRelative.js';

/**
 * Carry one adapter reference into the record shape.
 *
 * The project root bounds the analysis: a file the reference loads from
 * outside it is as external as a package, so it is recorded by its specifier,
 * not by a path the server would refuse on every submission.
 * @param projectRoot Absolute root the resolved path is made relative to.
 * @param reference Reference the adapter reported.
 * @returns The record reference: `{ unresolved: true }` for a null
 *   `resolvedPath`, `{ external: specifier }` for one outside the root, and
 *   the project-relative `{ path }` otherwise.
 */
export function toReference(
  projectRoot: string,
  reference: DependencyReference,
): Reference {
  return {
    specifier: reference.rawSpecifier,
    ...(reference.sourceText === undefined
      ? {}
      : { sourceText: reference.sourceText }),
    ...(reference.line === undefined ? {} : { line: reference.line }),
    kind: reference.kind,
    ...(reference.certainty === 'indeterminate'
      ? { certainty: 'indeterminate' as const }
      : {}),
    resolved:
      reference.resolvedPath === null
        ? { unresolved: true }
        : isInsideRoot(projectRoot, reference.resolvedPath)
          ? { path: toPosixRelative(projectRoot, reference.resolvedPath) }
          : { external: reference.rawSpecifier },
  };
}
