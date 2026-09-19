import type { FactsReference } from '../schema/fileFactsSchema.js';

import type {
  FactsRejection,
  FactsValidationContext,
} from './types/factsValidationTypes.js';
import { buildFactsRejection } from './utils/buildFactsRejection.js';
import { isProjectFilePathValid } from './utils/isProjectFilePathValid.js';
import { locateSourceText } from './utils/locateSourceText.js';

/** References that survived validation, and the ones that did not. */
export interface ReferenceValidation {
  references: FactsReference[];
  rejections: FactsRejection[];
}

/**
 * Apply the string-existence and resolved-path checks to one record's references.
 *
 * A reference failing either check is dropped on its own; the record around it
 * still stores (spec §4.2, §4.3). `line` is never a rejection reason: a string
 * that is in the file but not on the reported line keeps its reference and
 * trades the line for every line it does appear on, because a provider reporting
 * a stale line number is not making a false claim about the reference existing.
 * A resolved path that passes every check but names no scanned file becomes
 * `external`, which carries no dependency edge.
 *
 * @param context - Project root, scanned paths and scope predicate.
 * @param references - References as submitted.
 * @param lines - The file's current contents, split into lines.
 * @param path - Project-relative path of the owning record, for rejections.
 * @param pointer - JSON pointer of the owning record in the submission.
 * @returns Surviving references, with server-owned line fields rewritten.
 */
export function validateReferences(
  context: FactsValidationContext,
  references: readonly FactsReference[],
  lines: readonly string[],
  path: string,
  pointer: string,
): ReferenceValidation {
  const accepted: FactsReference[] = [];
  const rejections: FactsRejection[] = [];
  for (const [index, reference] of references.entries()) {
    const at = `${pointer}/references/${index}`;
    const found = locateSourceText(lines, reference.sourceText ?? reference.specifier);
    if (found.length === 0) {
      rejections.push(
        buildFactsRejection(path, at, 'REFERENCE_ABSENT', reference.specifier),
      );
      continue;
    }
    const resolved = resolveEdge(context, reference);
    if (resolved === null) {
      rejections.push(
        buildFactsRejection(
          path,
          `${at}/resolved`,
          'RESOLVED_PATH_INVALID',
          reference.specifier,
        ),
      );
      continue;
    }
    const onReportedLine =
      reference.line !== undefined && found.includes(reference.line);
    accepted.push({
      ...reference,
      resolved,
      ...(onReportedLine
        ? { line: reference.line, candidateLines: undefined }
        : { line: undefined, candidateLines: found }),
    });
  }
  return { references: accepted, rejections };
}

/**
 * Judge one reference's resolution against the project tree.
 * @param context Project root and scanned paths.
 * @param reference Reference whose `resolved` branch is judged.
 * @returns The resolution to store, downgraded to `external` when the path is
 * valid but unscanned, or null when §4.3 rejects it.
 */
function resolveEdge(
  context: FactsValidationContext,
  reference: FactsReference,
): FactsReference['resolved'] | null {
  if (!('path' in reference.resolved)) return reference.resolved;
  const target = reference.resolved.path;
  if (!isProjectFilePathValid(context.projectRoot, target)) return null;
  return context.scannedPaths.has(target)
    ? { path: target }
    : { external: target };
}
