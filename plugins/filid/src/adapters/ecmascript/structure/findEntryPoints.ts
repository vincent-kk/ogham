import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

import type { EntryPointDescriptor } from '../../../types/fractal.js';

import {
  ECMASCRIPT_ADAPTER_ID,
  EXECUTABLE_ENTRY_BASENAMES,
  FRAMEWORK_ENTRY_BASENAMES,
  FRAMEWORK_PACKAGES,
  MODULE_ENTRY_BASENAMES,
  SOURCE_EXTENSIONS,
} from './ecmascriptConventions.js';

function findNearestPackage(directoryPath: string): string | null {
  let current = directoryPath;
  for (;;) {
    const candidate = join(current, 'package.json');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function detectedFrameworks(directoryPath: string): string[] {
  const packagePath = findNearestPackage(directoryPath);
  if (!packagePath) return [];
  try {
    const parsed = JSON.parse(readFileSync(packagePath, 'utf8')) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
    };
    const dependencies = {
      ...parsed.dependencies,
      ...parsed.devDependencies,
    };
    return [
      ...new Set(
        Object.keys(dependencies)
          .map(
            (name) =>
              FRAMEWORK_PACKAGES[name as keyof typeof FRAMEWORK_PACKAGES],
          )
          .filter((value): value is NonNullable<typeof value> =>
            Boolean(value),
          ),
      ),
    ];
  } catch {
    return [];
  }
}

export function findEntryPoints(directoryPath: string): EntryPointDescriptor[] {
  const frameworks = detectedFrameworks(directoryPath);
  const entries = readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) =>
      SOURCE_EXTENSIONS.includes(
        extname(name) as (typeof SOURCE_EXTENSIONS)[number],
      ),
    )
    .sort();
  const descriptors: EntryPointDescriptor[] = [];

  for (const name of entries) {
    const extension = extname(name);
    const stem = basename(name, extension);
    let kind: EntryPointDescriptor['kind'] | null = null;
    if ((MODULE_ENTRY_BASENAMES as readonly string[]).includes(stem))
      kind = 'module';
    else if ((EXECUTABLE_ENTRY_BASENAMES as readonly string[]).includes(stem))
      kind = 'executable';
    else if (
      frameworks.some((framework) =>
        (
          FRAMEWORK_ENTRY_BASENAMES[
            framework as keyof typeof FRAMEWORK_ENTRY_BASENAMES
          ] as ReadonlySet<string>
        ).has(stem),
      )
    )
      kind = 'framework';
    if (!kind) continue;
    descriptors.push({
      path: join(directoryPath, name),
      kind,
      adapterId: ECMASCRIPT_ADAPTER_ID,
      surface: kind === 'framework' ? 'opaque' : 'enumerated',
    });
  }

  return descriptors;
}
