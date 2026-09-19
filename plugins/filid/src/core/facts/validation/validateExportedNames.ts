import type { FileFacts } from '../schema/fileFactsSchema.js';

import type { FactsRejection } from './types/factsValidationTypes.js';
import { buildFactsRejection } from './utils/buildFactsRejection.js';
import { locateSourceText } from './utils/locateSourceText.js';

/** Exported names that survived the existence check, and the ones that did not. */
export interface ExportedNameValidation {
  entrySurface: FileFacts['entrySurface'];
  rejections: FactsRejection[];
}

/**
 * Apply the string-existence check to a record's entry-point surface.
 *
 * Exported names follow the same rule as references (spec §4.2): a name absent
 * from the file is dropped with its own rejection, and a name present somewhere
 * other than its reported line keeps the name and trades the line for the lines
 * it is on. `hasDirectDeclarations` and `certainty` are provider claims filid
 * cannot check without reading the code, so they pass through unchanged.
 *
 * @param entrySurface - The submitted surface, or undefined when the provider
 * reported none — which is "not reported", not "empty".
 * @param lines - The file's current contents, split into lines.
 * @param path - Project-relative path of the owning record, for rejections.
 * @param pointer - JSON pointer of the owning record in the submission.
 * @returns The surface to store, with only verified names.
 */
export function validateExportedNames(
  entrySurface: FileFacts['entrySurface'],
  lines: readonly string[],
  path: string,
  pointer: string,
): ExportedNameValidation {
  if (entrySurface === undefined)
    return { entrySurface: undefined, rejections: [] };
  const accepted: NonNullable<FileFacts['entrySurface']>['exportedNames'] = [];
  const rejections: FactsRejection[] = [];
  for (const [index, exported] of entrySurface.exportedNames.entries()) {
    const found = locateSourceText(lines, exported.name);
    if (found.length === 0) {
      rejections.push(
        buildFactsRejection(
          path,
          `${pointer}/entrySurface/exportedNames/${index}`,
          'EXPORTED_NAME_ABSENT',
        ),
      );
      continue;
    }
    const onReportedLine =
      exported.line !== undefined && found.includes(exported.line);
    accepted.push(
      onReportedLine
        ? { name: exported.name, line: exported.line }
        : { name: exported.name, candidateLines: found },
    );
  }
  return {
    entrySurface: { ...entrySurface, exportedNames: accepted },
    rejections,
  };
}
