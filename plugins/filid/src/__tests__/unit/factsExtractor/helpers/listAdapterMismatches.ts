import { portableRelative } from '@ogham/cross-platform';

import {
  ecmascriptStructureAdapter,
  ecmascriptVerificationAdapter,
} from '../../../../adapters/ecmascript/index.js';
import type { FileFacts } from '../../../../factsExtractor/index.js';

/** One axis of one file whose record differs from the adapter. */
export interface AdapterMismatch {
  path: string;
  axis: 'references' | 'entrySurface' | 'verification';
  adapter: unknown;
  facts: unknown;
}

/**
 * Compare each record with the adapter called directly on the same file.
 *
 * Both sides are put in one shape. The adapter's resolved path becomes
 * `{ path }` relative to the root, `{ unresolved: true }` when null, and
 * `{ external: specifier }` when it lies outside the root — the normalization
 * the S3c comparison applies to the adapter too. `ExportedName.line` is left
 * out, since the adapter has none.
 * @param projectRoot Absolute project root the records are relative to.
 * @param records Records of the extraction under test.
 * @returns Every axis that differs, empty when the records match the adapter.
 */
export async function listAdapterMismatches(
  projectRoot: string,
  records: readonly FileFacts[],
): Promise<AdapterMismatch[]> {
  const mismatches: AdapterMismatch[] = [];
  const relative = (path: string) =>
    portableRelative(projectRoot, path).replaceAll('\\', '/');
  for (const record of records) {
    const file = `${projectRoot}/${record.path}`;
    const references = (
      await ecmascriptStructureAdapter.extractDependencies(file)
    ).map(
      ({ rawSpecifier, sourceText, kind, certainty, line, resolvedPath }) => ({
        specifier: rawSpecifier,
        sourceText,
        kind,
        certainty,
        line,
        resolved:
          resolvedPath === null
            ? { unresolved: true }
            : relative(resolvedPath).startsWith('../')
              ? { external: rawSpecifier }
              : { path: relative(resolvedPath) },
      }),
    );
    const factsReferences = record.references.map((reference) => ({
      specifier: reference.specifier,
      sourceText: reference.sourceText,
      kind: reference.kind,
      certainty: reference.certainty,
      line: reference.line,
      resolved: reference.resolved,
    }));
    const inspection = await ecmascriptStructureAdapter.inspectEntryPoint(file);
    const surface = {
      exportedNames: inspection.exportedNames,
      hasDirectDeclarations: inspection.hasDirectDeclarations,
      certainty: inspection.certainty,
    };
    const factsSurface = record.entrySurface && {
      exportedNames: record.entrySurface.exportedNames.map(({ name }) => name),
      hasDirectDeclarations: record.entrySurface.hasDirectDeclarations,
      certainty: record.entrySurface.certainty,
    };
    const verification = JSON.parse(
      JSON.stringify({
        role: await ecmascriptVerificationAdapter.classify(file),
        cases: await ecmascriptVerificationAdapter.count(file),
      }),
    ) as unknown;
    const pairs = [
      ['references', references, factsReferences],
      ['entrySurface', surface, factsSurface],
      ['verification', verification, record.verification],
    ] as const;
    for (const [axis, adapter, facts] of pairs)
      if (JSON.stringify(adapter) !== JSON.stringify(facts))
        mismatches.push({ path: record.path, axis, adapter, facts });
  }
  return mismatches;
}
