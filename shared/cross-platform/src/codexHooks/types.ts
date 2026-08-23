/**
 * Minimal shapes for adapting Codex's `apply_patch` tool call into the Claude
 * hook-input vocabulary the bundled ogham handlers match on. Only the fields the
 * normaliser touches are modelled.
 */

/** One context, addition, or removal line preserved from an update hunk. */
export interface ApplyPatchHunkLine {
  /** Codex prefix that gives the line its patch meaning. */
  readonly prefix: " " | "+" | "-";
  /** Line text after removing the patch prefix. */
  readonly text: string;
}

/** One ordered update hunk with its optional search header. */
export interface ApplyPatchHunk {
  /** Text after `@@ `, or empty for a bare or implicit hunk. */
  readonly header: string;
  /** Context, addition, and removal lines in physical patch order. */
  readonly lines: ApplyPatchHunkLine[];
}

/** One file operation carried inside an `apply_patch` command. */
export interface ApplyPatchOp {
  kind: "add" | "update" | "delete";
  /** The file the operation targets (verbatim from the `*** … File:` header). */
  filePath: string;
  /** Rename destination from a single `*** Move to:` in an update section. */
  moveTo?: string;
  /** Ordered update hunks; empty for add, delete, and bodyless Move. */
  hunks: ApplyPatchHunk[];
  /** Lines the patch adds (leading `+` stripped). For an add, the whole file. */
  addedLines: string[];
  /** Lines the patch removes (leading `-` stripped). Empty for an add. */
  removedLines: string[];
}

/** Provenance shared by the two logical effects of one Codex Move. */
export interface CodexMoveProvenance {
  /** Identifies the normalized operation without inventing a host tool name. */
  kind: "move";
  /** Identifies which path effect carries this provenance. */
  role: "source" | "destination";
  /** File removed by the physical Move. */
  sourcePath: string;
  /** File created by the physical Move. */
  destinationPath: string;
  /** Immutable hunk structure used to project the destination content. */
  readonly hunks: readonly (Omit<ApplyPatchHunk, "lines"> & {
    readonly lines: readonly ApplyPatchHunkLine[];
  })[];
  /** Patch additions, which are a delta rather than complete content. */
  addedLines: readonly string[];
  /** Patch removals used for conservative destination projection. */
  removedLines: readonly string[];
}

/** Result of projecting ordered apply_patch hunks onto current content. */
export type ProjectApplyPatchHunksResult =
  | {
      /** Projection matched every hunk uniquely. */
      kind: "exact";
      /** Complete content after applying every hunk. */
      content: string;
    }
  | {
      /** A hunk's before-image was absent from the current content. */
      kind: "stale-source";
      /** Zero-based index of the first hunk that could not match. */
      hunkIndex: number;
    }
  | {
      /** A hunk's before-image matched more than one location. */
      kind: "ambiguous";
      /** Zero-based index of the first hunk with multiple matches. */
      hunkIndex: number;
    };

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
        ? {
            tool_name: string;
            tool_input: Partial<T["tool_input"]> & Record<string, unknown>;
          }
        : CodexToolUse) & {
        /** Path and delta provenance for a normalized Codex Move effect. */
        codexPatch?: CodexMoveProvenance;
        /** Verbatim targets touched by earlier physical patch sections. */
        codexPriorTouchedPaths?: readonly string[];
      }
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
