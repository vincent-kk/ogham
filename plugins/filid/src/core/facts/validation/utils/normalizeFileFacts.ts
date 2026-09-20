import type { FileFacts } from '../../schema/fileFactsSchema.js';

/**
 * Put one accepted record into filid's canonical shape.
 *
 * Providers choose their own ordering, so two tools reporting the same facts
 * would otherwise produce different bytes and different record digests. Sorting
 * and fixed key order are what make a stored record a function of its content
 * alone (spec §2.1); every list is ordered by raw UTF-8 bytes rather than by
 * locale, so the bytes do not depend on the host.
 *
 * @param facts - A record that passed every check.
 * @returns The same facts with sorted lists and a fixed key order.
 */
export function normalizeFileFacts(facts: FileFacts): FileFacts {
  return {
    schemaVersion: facts.schemaVersion,
    path: facts.path,
    contentHash: facts.contentHash,
    references: [...facts.references].sort((left, right) =>
      byBytes(
        `${left.specifier}\0${left.kind}\0${JSON.stringify(left.resolved)}`,
        `${right.specifier}\0${right.kind}\0${JSON.stringify(right.resolved)}`,
      ),
    ),
    ...(facts.entrySurface
      ? {
          entrySurface: {
            exportedNames: [...facts.entrySurface.exportedNames].sort(
              (left, right) => byBytes(left.name, right.name),
            ),
            hasDirectDeclarations: facts.entrySurface.hasDirectDeclarations,
            certainty: facts.entrySurface.certainty,
          },
        }
      : {}),
    ...(facts.verification ? { verification: facts.verification } : {}),
    ...(facts.nonReferences
      ? {
          nonReferences: [...facts.nonReferences].sort(
            (left, right) => left.line - right.line,
          ),
        }
      : {}),
    ...(facts.toolError ? { toolError: facts.toolError } : {}),
    provenance: {
      ...facts.provenance,
      resolutionInputs: [...facts.provenance.resolutionInputs].sort(
        (left, right) => byBytes(left.path, right.path),
      ),
    },
  };
}

/**
 * Compare two strings by their raw UTF-8 bytes.
 * @param left First string.
 * @param right Second string.
 * @returns Negative, zero or positive as `Buffer.compare` reports.
 */
function byBytes(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}
