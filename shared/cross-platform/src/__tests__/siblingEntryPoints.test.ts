import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { normalizeImportTarget } from "./helpers/normalizeImportTarget.js";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function declaredNestedEntryPointTargets(directory: string): readonly string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    if (statSync(path).isDirectory())
      return declaredNestedEntryPointTargets(path);
    if (name !== "index.ts" || path === resolve(sourceRoot, "index.ts"))
      return [];
    const entryPointRoot = dirname(path);
    if (
      !existsSync(resolve(entryPointRoot, "INTENT.md")) &&
      !existsSync(resolve(entryPointRoot, "DETAIL.md"))
    )
      return [];
    return [normalizeImportTarget(relative(sourceRoot, path))];
  });
}

function inspectRootReexports(): {
  readonly targets: readonly string[];
  readonly violations: readonly string[];
} {
  const path = resolve(sourceRoot, "index.ts");
  const sourceFile = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const diagnostics = (
    sourceFile as ts.SourceFile & {
      readonly parseDiagnostics: readonly ts.Diagnostic[];
    }
  ).parseDiagnostics;
  const targets: string[] = [];
  const violations = diagnostics.map(({ messageText }) =>
    ts.flattenDiagnosticMessageText(messageText, "\n"),
  );
  if (sourceFile.statements.length === 0)
    violations.push("root entry point is empty");

  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      statement.moduleSpecifier === undefined ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.exportClause === undefined ||
      !ts.isNamedExports(statement.exportClause)
    ) {
      violations.push(statement.getText(sourceFile));
      continue;
    }

    const specifier = statement.moduleSpecifier.text;
    const target = resolve(dirname(path), specifier.replace(/\.js$/, ".ts"));
    if (
      !specifier.startsWith("./") ||
      !specifier.endsWith(".js") ||
      target.endsWith("/index.ts") ||
      !existsSync(target)
    ) {
      violations.push(statement.getText(sourceFile));
      continue;
    }
    targets.push(normalizeImportTarget(relative(sourceRoot, target)));
  }

  return { targets, violations };
}

const rootReexports = inspectRootReexports();
const declaredInternalTargets = new Set([
  ...rootReexports.targets,
  ...declaredNestedEntryPointTargets(sourceRoot),
]);

const boundarySources = [
  "configScope/layers/operations/resolveConfigLayers.ts",
  "configScope/layers/operations/writeConfigLayer.ts",
  "configScope/layers/utils/readLayer.ts",
  "hooks/error/errorLogPath.ts",
  "hostPaths/absolute/toAbsoluteRoot.ts",
  "paths/state/hostStateRoot.ts",
  "paths/state/stateRoot.ts",
] as const;

describe("cross-platform sibling boundaries", () => {
  it.each(boundarySources)(
    "%s uses declared sibling entry points",
    (sourcePath) => {
      expect(rootReexports.violations).toEqual([]);

      const absoluteSourcePath = resolve(sourceRoot, sourcePath);
      const source = readFileSync(absoluteSourcePath, "utf8");
      const importerModule = sourcePath.split("/")[0];
      const violations = [
        ...source.matchAll(/\bfrom\s+["']([^"']+)["']/g),
      ].flatMap((match) => {
        const specifier = match[1];
        if (!specifier?.startsWith(".")) return [];

        const targetPath = relative(
          sourceRoot,
          resolve(
            dirname(absoluteSourcePath),
            specifier.replace(/\.js$/, ".ts"),
          ),
        );
        const normalizedTargetPath = normalizeImportTarget(targetPath);
        const targetModule = normalizedTargetPath.split("/")[0];
        if (
          targetModule === importerModule ||
          declaredInternalTargets.has(normalizedTargetPath)
        )
          return [];

        return [`${sourcePath} -> ${specifier}`];
      });

      expect(violations).toEqual([]);
    },
  );

  it("normalizes Windows separators before matching declared internal targets", () => {
    expect(
      declaredInternalTargets.has(
        normalizeImportTarget("paths\\state\\pluginCache.ts"),
      ),
    ).toBe(true);
    expect(rootReexports.violations).toEqual([]);
  });
});
