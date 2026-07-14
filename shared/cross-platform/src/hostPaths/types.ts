/**
 * Agent host running the plugin. `unknown` covers an `OGHAM_HOST` marker this
 * build does not recognise — treated conservatively (no coordinate is guessed).
 */
export type Host = "claude" | "codex" | "agy" | "unknown";

/**
 * Where a host expects rule documents to live, relative to the project root.
 *
 * Claude reads a directory of markdown files; Codex reads exactly one instruction
 * file, so each document becomes a marker-delimited section of it. The two shapes
 * are different enough that callers must branch — which is the point of making the
 * distinction a type rather than a path string.
 */
export type RuleDocsTarget =
  | { readonly kind: "directory"; readonly path: string }
  | { readonly kind: "merge"; readonly file: string };
