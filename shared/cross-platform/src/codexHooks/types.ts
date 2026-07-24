/**
 * Minimal shapes for adapting Codex's `apply_patch` tool call into the Claude
 * hook-input vocabulary the bundled ogham handlers match on. Only the fields the
 * normaliser touches are modelled.
 */

/** One file operation carried inside an `apply_patch` command. */
export interface ApplyPatchOp {
  kind: "add" | "update" | "delete";
  /** The file the operation targets (verbatim from the `*** … File:` header). */
  filePath: string;
  /** Lines the patch adds (leading `+` stripped). For an add, the whole file. */
  addedLines: string[];
  /** Lines the patch removes (leading `-` stripped). Empty for an add. */
  removedLines: string[];
}

/** The subset of a Claude hook input this module reads and rewrites. */
export interface CodexToolUse {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}
