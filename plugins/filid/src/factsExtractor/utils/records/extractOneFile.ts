import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { extractDependencyReferences } from '../../../adapters/ecmascript/structure/extractDependencyReferences.js';
import { inspectEntrySurface } from '../../../adapters/ecmascript/structure/inspectEntrySurface.js';
import { classifyVerificationPath } from '../../../adapters/ecmascript/verification/classifyVerificationPath.js';
import { countVerificationCases } from '../../../adapters/ecmascript/verification/countVerificationCases.js';
import type { FactsProvenance, FileFacts } from '../../types/fileFacts.js';
import type { ProjectFile } from '../paths/resolveProjectFile.js';

import { toReference } from './toReference.js';

/** `toolError.message` of a file holding a NUL byte; the adapter scans any bytes without failing, so it is not asked. */
const BINARY_CONTENT_MESSAGE =
  'binary content: the file holds a NUL byte, so it is not source text.';

/**
 * Make an adapter error message the same on every machine.
 * @param message Message as the adapter raised it.
 * @param projectRoot Absolute project root, written as `.`.
 * @param file The file, written as its project-relative path.
 * @returns The message with every other absolute path written as `<path>`.
 */
function redactMessage(
  message: string,
  projectRoot: string,
  file: ProjectFile,
): string {
  return message
    .replaceAll(file.absolutePath, file.path)
    .replaceAll(projectRoot, '.')
    .replace(/(?<![\w.~-])\/[^\s'"`()<>,;]+/g, '<path>')
    .replace(/\b[A-Za-z]:\\[^\s'"`()<>,;]*/g, '<path>');
}

/**
 * Build one file's record from the ECMAScript adapter's values.
 *
 * Every axis is reported for every file: references, the entry surface the
 * adapter would inspect, and the verification role with its case count —
 * `unsupported` included, since an absent axis means "not reported". A file
 * holding a NUL byte is not source text and becomes a `toolError` record
 * without reaching the adapter. An adapter exception on bytes that were read
 * makes a `toolError` record bound to those bytes instead of stopping the run;
 * the file and root in its message are made project-relative and any other
 * absolute path becomes `<path>`, so the record stays the same on every
 * machine.
 * @param projectRoot Absolute project root.
 * @param file Accepted file inside the root.
 * @param provenance Provenance shared by every record of the run.
 * @returns The record, or null when the file cannot be read: a record without
 *   the file's bytes could never match the server's hash binding.
 */
export async function extractOneFile(
  projectRoot: string,
  file: ProjectFile,
  provenance: FactsProvenance,
): Promise<FileFacts | null> {
  let bytes: Buffer;
  try {
    bytes = readFileSync(file.absolutePath);
  } catch {
    return null;
  }
  const record = (fields: Partial<FileFacts>): FileFacts => ({
    schemaVersion: 1,
    path: file.path,
    contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    references: [],
    ...fields,
    provenance,
  });
  if (bytes.includes(0))
    return record({ toolError: { message: BINARY_CONTENT_MESSAGE } });
  try {
    const references = await extractDependencyReferences(file.absolutePath);
    const surface = await inspectEntrySurface(file.absolutePath);
    const role = await classifyVerificationPath(file.absolutePath);
    const cases = countVerificationCases(file.absolutePath);
    return record({
      references: references.map((reference) =>
        toReference(projectRoot, reference),
      ),
      entrySurface: {
        exportedNames: surface.exportedNames.map((name) => ({ name })),
        hasDirectDeclarations: surface.hasDirectDeclarations,
        certainty: surface.certainty,
      },
      verification: {
        role,
        cases: {
          certainty: cases.certainty,
          ...(cases.exactCount === undefined
            ? {}
            : { exactCount: cases.exactCount }),
          knownLowerBound: cases.knownLowerBound,
          reasons: cases.reasons,
        },
      },
    });
  } catch (error) {
    return record({
      toolError: {
        message: redactMessage(
          error instanceof Error ? error.message : String(error),
          projectRoot,
          file,
        ),
      },
    });
  }
}
