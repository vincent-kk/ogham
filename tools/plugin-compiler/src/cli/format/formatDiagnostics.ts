import type { Diagnostic } from "../../types/index.js";

export function formatDiagnostics(diagnostics: Diagnostic[]): string {
  return diagnostics
    .map(
      (diagnostic) =>
        `${diagnostic.level === "error" ? "✗" : "⚠"} ${diagnostic.code}: ${diagnostic.message}\n`,
    )
    .join("");
}
