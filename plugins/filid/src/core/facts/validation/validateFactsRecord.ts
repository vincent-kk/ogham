import { resolveContainedPath } from '@ogham/cross-platform';

import type { FileFacts } from '../schema/fileFactsSchema.js';

import type {
  FactsValidationContext,
  FactsValidationResult,
} from './types/factsValidationTypes.js';
import { checkDeclaredInputs } from './utils/checkDeclaredInputs.js';
import { buildFactsRejection } from './utils/buildFactsRejection.js';
import { hashProjectFile } from './utils/hashProjectFile.js';
import { normalizeFileFacts } from './utils/normalizeFileFacts.js';
import { splitSourceLines } from './utils/splitSourceLines.js';
import { validateExportedNames } from './validateExportedNames.js';
import { validateReferences } from './validateReferences.js';

/**
 * Check one submitted record against the project's current bytes (spec §4.1–4.3).
 *
 * The order is deliberate. Path legality and scope come first, because a record
 * naming a file filid does not scan or does not cover has nothing to bind to and
 * submission may not widen the scope. Content-hash binding comes next: every
 * later check reads the file, and reading bytes the provider did not see would
 * accept a record about a file that has since changed — and a file filid will
 * not read at all is reported as that, not as a mismatch, because "re-extract"
 * would reproduce the same refusal. The inputs the record declares are checked
 * next, because a record resolved against a config that has since moved carries
 * resolutions no later check can re-derive. Only then are the per-reference
 * checks applied, each rejecting its own reference rather than the record around
 * it.
 *
 * @param context - Project root, the scanned path set and the scope predicate.
 * @param facts - A record that already parsed against the schema.
 * @param pointer - JSON pointer of this record in the submitted document.
 * @returns The record to store and every rejection it produced. `accepted` is
 * null exactly when a record-level check failed.
 */
export function validateFactsRecord(
  context: FactsValidationContext,
  facts: FileFacts,
  pointer: string,
): FactsValidationResult {
  if (!isStorablePath(context, facts.path))
    return { accepted: null, rejections: [buildFactsRejection(facts.path, pointer, 'PATH_INVALID')] };
  if (!context.inScope(facts.path))
    return { accepted: null, rejections: [buildFactsRejection(facts.path, pointer, 'OUT_OF_SCOPE')] };
  const current = hashProjectFile(context.projectRoot, facts.path);
  if (!current.ok)
    return {
      accepted: null,
      rejections: [
        buildFactsRejection(facts.path, pointer, 'SOURCE_UNREADABLE'),
      ],
    };
  if (current.contentHash !== facts.contentHash)
    return {
      accepted: null,
      rejections: [buildFactsRejection(facts.path, pointer, 'HASH_MISMATCH')],
    };
  const inputs = checkDeclaredInputs(
    facts.provenance,
    context.hashDeclaredInput,
  );
  if (!inputs.ok)
    return {
      accepted: null,
      rejections: [
        buildFactsRejection(
          facts.path,
          `${pointer}/provenance/resolutionInputs`,
          inputs.reason === 'stale'
            ? 'RESOLUTION_INPUT_STALE'
            : 'RESOLUTION_INPUT_UNREADABLE',
          undefined,
          inputs.path,
        ),
      ],
    };
  const lines = splitSourceLines(current.contents.toString('utf8'));
  const references = validateReferences(
    context,
    facts.references,
    lines,
    facts.path,
    pointer,
  );
  const exported = validateExportedNames(
    facts.entrySurface,
    lines,
    facts.path,
    pointer,
  );
  return {
    accepted: normalizeFileFacts({
      ...facts,
      references: references.references,
      entrySurface: exported.entrySurface,
    }),
    rejections: [...references.rejections, ...exported.rejections],
  };
}

/**
 * Whether a record's own path names a file this project scans.
 * @param context Project root and scanned path set.
 * @param path Project-relative path the record declares.
 * @returns True when the path stays inside the project and was scanned.
 */
function isStorablePath(
  context: FactsValidationContext,
  path: string,
): boolean {
  if (!context.scannedPaths.has(path)) return false;
  try {
    resolveContainedPath(context.projectRoot, path);
    return true;
  } catch {
    return false;
  }
}
