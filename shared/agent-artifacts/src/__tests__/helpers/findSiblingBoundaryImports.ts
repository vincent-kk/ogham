import { dirname, relative, resolve, sep } from "node:path";

const FRACTAL_MODULES = new Set([
  "project",
  "user",
  "rules",
  "instructions",
  "mcp",
  "targets",
  "transactions",
  "validation",
]);
const IMPORT_SPECIFIER = /\bfrom\s+["']([^"']+)["']/g;

export function findSiblingBoundaryImports(
  sourceRoot: string,
  sourcePath: string,
  source: string,
): readonly string[] {
  const importerModule = relative(sourceRoot, sourcePath).split(sep)[0];
  const violations: string[] = [];

  for (const match of source.matchAll(IMPORT_SPECIFIER)) {
    const specifier = match[1];
    if (!specifier?.startsWith(".")) continue;

    const targetRelative = relative(
      sourceRoot,
      resolve(dirname(sourcePath), specifier),
    );
    const targetModule = targetRelative.split(sep)[0];
    if (
      !FRACTAL_MODULES.has(targetModule) ||
      targetModule === importerModule ||
      targetRelative === `${targetModule}${sep}index.js`
    )
      continue;

    violations.push(`${relative(sourceRoot, sourcePath)} -> ${specifier}`);
  }

  return violations;
}
