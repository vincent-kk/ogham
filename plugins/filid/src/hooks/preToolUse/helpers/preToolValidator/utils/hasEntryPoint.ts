// Entry-point knowledge belongs to the adapter; hook bundle constraints permit importing only its constants here.
import { readFileSync, readdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

import {
  EXECUTABLE_ENTRY_BASENAMES,
  FRAMEWORK_ENTRY_BASENAMES,
  MANIFEST_ENTRY_FILENAME,
  MODULE_ENTRY_BASENAMES,
  SOURCE_EXTENSIONS,
} from '../../../../../adapters/ecmascript/structure/ecmascriptConventions.js';

/**
 * Reads directory entries and the project's declared entry-point file names
 * (`structure.entryPointOverrides`, keyed by adapter id) before allowing a demotion.
 * @param directory - Absolute, host-canonical directory containing the document.
 * @param projectRoot - Validated absolute project cwd containing .filid/config.json.
 * @returns True when an entry point exists or directory/config evidence cannot be read or parsed; false only when absence is established.
 */
export function hasEntryPoint(directory: string, projectRoot: string): boolean {
  try {
    const entries = readdirSync(directory);
    if (
      entries.some((name) => {
        if (name === MANIFEST_ENTRY_FILENAME) return true;
        const extension = extname(name);
        if (!(SOURCE_EXTENSIONS as readonly string[]).includes(extension))
          return false;
        const stem = basename(name, extension);
        return (
          (MODULE_ENTRY_BASENAMES as readonly string[]).includes(stem) ||
          (EXECUTABLE_ENTRY_BASENAMES as readonly string[]).includes(stem) ||
          Object.values(FRAMEWORK_ENTRY_BASENAMES).some((names) =>
            names.has(stem),
          )
        );
      })
    )
      return true;

    const config = JSON.parse(
      readFileSync(join(projectRoot, '.filid', 'config.json'), 'utf8'),
    ) as { structure?: { entryPointOverrides?: Record<string, unknown> } };
    const declaredNames = Object.values(
      config.structure?.entryPointOverrides ?? {},
    ).flatMap((names) => (Array.isArray(names) ? names : []));
    return entries.some((name) => declaredNames.includes(name));
  } catch {
    return true;
  }
}
