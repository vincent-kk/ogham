/**
 * Host file-edit tools the PreToolUse matcher selects for the edit notice.
 * `hooks/hooks.json` states the same names in its matcher; `wiring.test.ts`
 * keeps the two in step.
 */
export const EDIT_TOOLS = ['Edit', 'Write', 'NotebookEdit'] as const;

/**
 * Codex's single edit tool. Its V4A patch reaches the hook as one call; the
 * PreToolUse entry expands it into one `Write` or `Edit` per touched file.
 */
export const CODEX_PATCH_TOOL = 'apply_patch';

/**
 * Distinct files edited in one unbound turn at which the second notice says
 * the work is no longer a single surgical change. The spread notice is due at
 * the second distinct file, matching the election rule "a change touching 2+
 * files".
 */
export const EDIT_NOTICE_FILE_THRESHOLD = 2;

/**
 * Repository-relative path prefixes (plain prefixes, not globs) whose edits
 * never count: seiri's own plans, ledgers and session state.
 */
export const EDIT_NOTICE_EXCLUDED_PREFIXES = ['.seiri/'] as const;

/**
 * Distinct edited-file hashes one actor records per turn. Shared by
 * `observeEdit` (where it stops recording) and `isWorkflowState` (what it
 * validates the persisted list against).
 */
export const EDIT_TRACKED_FILES_CAP = 64;

/**
 * The two edit notices a turn can carry, each at most once: `first` at the
 * turn's first edited file, `spread` when the file count reaches
 * {@link EDIT_NOTICE_FILE_THRESHOLD}.
 */
export const EDIT_NOTICE_KINDS = ['first', 'spread'] as const;

/** One of {@link EDIT_NOTICE_KINDS}. */
export type EditNoticeKind = (typeof EDIT_NOTICE_KINDS)[number];
