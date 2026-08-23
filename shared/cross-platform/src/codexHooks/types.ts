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

/** A parser result that cannot represent a successful empty patch. */
export type ParseApplyPatchResult =
  | {
      ok: true;
      operations: readonly [ApplyPatchOp, ...ApplyPatchOp[]];
    }
  | { ok: false; reason: string };

/**
 * Preserve caller-owned fields while widening the two fields normalization may
 * rewrite. Required hook fields remain required; broad dispatcher fields stay
 * optional.
 */
export type NormalizedCodexToolUse<T extends CodexToolUse> = T extends unknown
  ? Omit<T, "tool_name" | "tool_input"> &
      (T extends {
        tool_name: string;
        tool_input: Record<string, unknown>;
      }
        ? { tool_name: string; tool_input: Record<string, unknown> }
        : CodexToolUse)
  : never;

/** A batch normalizer result that keeps the physical call for host policy. */
export type NormalizeCodexToolUsesResult<T extends CodexToolUse> =
  | {
      ok: true;
      original: T;
      toolUses: readonly [
        NormalizedCodexToolUse<T>,
        ...NormalizedCodexToolUse<T>[],
      ];
    }
  | { ok: false; original: T; reason: string };
