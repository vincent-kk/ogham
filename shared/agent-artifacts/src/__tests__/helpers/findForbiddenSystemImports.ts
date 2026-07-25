import ts from "typescript";

import { isForbiddenSystemModule } from "./isForbiddenSystemModule.js";

export function findForbiddenSystemImports(source: string): readonly string[] {
  const sourceFile = ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const matches: string[] = [];
  const pending: ts.Node[] = [sourceFile];

  while (pending.length > 0) {
    const node = pending.pop();
    if (node === undefined) continue;

    let specifier: string | undefined;
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      specifier = node.moduleSpecifier.text;
    else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression !== undefined &&
      ts.isStringLiteral(node.moduleReference.expression)
    )
      specifier = node.moduleReference.expression.text;
    else if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0]!) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    )
      specifier = node.arguments[0]!.text;

    if (specifier !== undefined && isForbiddenSystemModule(specifier))
      matches.push(specifier);

    pending.push(...node.getChildren(sourceFile));
  }

  return matches;
}
