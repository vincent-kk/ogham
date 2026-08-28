import { z } from "zod";

import { SHA256_HEX_PATTERN } from "../constants/defaults.js";

const PROPERTY_KEY_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

/** Profile file layout version; a file with another version is ignored with a warning, never migrated silently. */
export const COMMENT_PROFILE_SCHEMA_VERSION = 1;

/** Entity property key — closed charset so a profile value can never shape a URL beyond one encoded path segment. */
export const PropertyKeySchema = z.string().regex(PROPERTY_KEY_PATTERN);

/** Which recipe applies to a site: replies live in the changelog, are ordinary comments, or were never classified. */
export const CommentProfilePatternSchema = z.enum([
  "changelog",
  "standard",
  "unknown",
]);

/** Inferred recipe classification for one Jira site. */
export type CommentProfilePattern = z.infer<typeof CommentProfilePatternSchema>;

/** One site's reply-plugin profile as stored under `sites[hostname]`. */
export const CommentProfileSchema = z
  .object({
    pattern: CommentProfilePatternSchema,
    propertyKeys: z.array(PropertyKeySchema).max(8),
    verifiedAt: z.string().datetime({ offset: true }),
  })
  .strict();

/** Validated reply-plugin profile for one Jira site. */
export type CommentProfile = z.infer<typeof CommentProfileSchema>;

/** User-approved profile accepted by `save_profile`; the persisted timestamp is assigned by the writer. */
export const CommentProfileSaveInputSchema = CommentProfileSchema.partial({
  verifiedAt: true,
});

/** Profile fields a caller may submit before the writer assigns `verifiedAt`. */
export type CommentProfileSaveInput = z.infer<
  typeof CommentProfileSaveInputSchema
>;

/** Flat MCP object shape; the protocol requires `inputSchema.type` to remain `object`. */
const CommentThreadObjectSchema = z
  .object({
    mode: z.enum(["read", "scan", "probe", "save_profile"]).optional(),
    base_url: z.string().url().optional(),
    issue_key: z.string().optional(),
    start_at: z.number().int().nonnegative().optional(),
    max_results: z.number().int().positive().max(100).optional(),
    expand: z.array(z.string()).optional(),
    jql: z.string().optional(),
    max_issues: z.number().int().positive().max(500).optional(),
    sample_issue_key: z.string().optional(),
    profile: CommentProfileSaveInputSchema.optional(),
    proposal_digest: z.string().regex(SHA256_HEX_PATTERN).optional(),
  })
  .strict();

/** Fields represented by the MCP-compatible top-level object schema. */
type CommentThreadObjectInput = z.infer<typeof CommentThreadObjectSchema>;

/** Mode-specific field names checked by the schema refinement. */
type CommentThreadModeField = Exclude<
  keyof CommentThreadObjectInput,
  "base_url" | "mode"
>;

/**
 * Require one field for the selected mode.
 * @param input Candidate MCP input.
 * @param context Zod refinement context receiving a field-local issue.
 * @param field Field that must be present.
 * @param mode Effective operation mode.
 */
function requireModeField(
  input: CommentThreadObjectInput,
  context: z.RefinementCtx,
  field: CommentThreadModeField,
  mode: string,
): void {
  if (input[field] !== undefined) return;
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: [field],
    message: `${field} is required for ${mode} mode`,
  });
}

/**
 * Reject fields owned by another mode instead of silently ignoring them.
 * @param input Candidate MCP input.
 * @param context Zod refinement context receiving field-local issues.
 * @param fields Fields not accepted by the selected mode.
 * @param mode Effective operation mode.
 */
function rejectModeFields(
  input: CommentThreadObjectInput,
  context: z.RefinementCtx,
  fields: readonly CommentThreadModeField[],
  mode: string,
): void {
  for (const field of fields) {
    if (input[field] === undefined) continue;
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [field],
      message: `${field} is not accepted in ${mode} mode`,
    });
  }
}

/** MCP-compatible object schema with mode-specific required and exclusive fields enforced at validation time. */
export const CommentThreadInputSchema = CommentThreadObjectSchema.superRefine(
  (input, context) => {
    const mode = input.mode ?? "read";
    switch (mode) {
      case "read":
        requireModeField(input, context, "issue_key", mode);
        rejectModeFields(
          input,
          context,
          [
            "jql",
            "max_issues",
            "sample_issue_key",
            "profile",
            "proposal_digest",
          ],
          mode,
        );
        return;
      case "scan":
        requireModeField(input, context, "jql", mode);
        rejectModeFields(
          input,
          context,
          [
            "issue_key",
            "start_at",
            "max_results",
            "expand",
            "sample_issue_key",
            "profile",
            "proposal_digest",
          ],
          mode,
        );
        return;
      case "probe":
        requireModeField(input, context, "sample_issue_key", mode);
        rejectModeFields(
          input,
          context,
          [
            "issue_key",
            "start_at",
            "max_results",
            "expand",
            "jql",
            "max_issues",
            "profile",
            "proposal_digest",
          ],
          mode,
        );
        return;
      case "save_profile":
        requireModeField(input, context, "profile", mode);
        rejectModeFields(
          input,
          context,
          [
            "issue_key",
            "start_at",
            "max_results",
            "expand",
            "jql",
            "max_issues",
            "sample_issue_key",
          ],
          mode,
        );
    }
  },
);

/** Validated arguments for one `comment_thread` invocation. */
export type CommentThreadInput = z.infer<typeof CommentThreadInputSchema>;

/** File envelope. `sites` values stay `unknown` here and are parsed one by one so a bad entry cannot poison its neighbours. */
export const CommentProfileFileSchema = z
  .object({
    schemaVersion: z.literal(COMMENT_PROFILE_SCHEMA_VERSION),
    sites: z.record(z.string(), z.unknown()),
  })
  .strict();

/** Validated envelope for the persisted per-site profile map. */
export type CommentProfileFile = z.infer<typeof CommentProfileFileSchema>;

/** One node of the merged thread; replies hang under their root via `replies`. */
export interface ThreadEntry {
  id: string;
  kind: "comment" | "reply";
  parentId?: string;
  author: string;
  created: string;
  body: string;
  source: "standard" | "changelog";
  nested?: boolean;
  deleted?: boolean;
  suspectedDuplicate?: boolean;
  orphan?: boolean;
  replies?: ThreadEntry[];
}

/** `false` means a truncated changelog; `"unknown"` means the changelog was unavailable. */
export type ThreadCompleteness = true | false | "unknown";

/** Parameters for reading one issue's recovered comment thread. */
export interface CommentThreadReadParams {
  issue_key: string;
  /** With `start_at` or `max_results` the read is one page, exactly like `fetch`; without both it pages through everything (cap 1000). */
  start_at?: number;
  max_results?: number;
  /** Passed through to the comment list request (e.g. `renderedBody`). */
  expand?: string[];
}

/** Recovered comment thread plus completeness and profile diagnostics. */
export interface CommentThreadResult {
  issue: string;
  thread: ThreadEntry[];
  warnings: string[];
  complete: ThreadCompleteness;
  profile: Pick<CommentProfile, "pattern" | "verifiedAt"> | null;
  /** Present only when no profile exists for the site — evidence (hostname, root count, probe sample) plus the pointer to the skill's thread-clue check. */
  hint?: string;
}

/** Parameters for scanning issues whose changelogs contain reply records. */
export interface CommentThreadScanParams {
  jql: string;
  /** Default 100, hard cap 500. */
  max_issues?: number;
}

/** Summary of issues found by a bounded comment-thread scan. */
export interface CommentThreadScanResult {
  scanned: number;
  issues: Array<{ key: string; replyCount: number; truncated: boolean }>;
  complete: boolean;
  warnings: string[];
}

/** Parameters for probing one representative Jira issue. */
export interface CommentThreadProbeParams {
  sample_issue_key: string;
}

/** What the probe observed on the sample issue; returned verbatim so the user can judge the proposal. */
export interface ProbeEvidence {
  sampleIssue: string;
  standardTotal: number;
  commentItems: number;
  distinctRoots: number;
  propertyKeys: string[];
  changelogTruncated: boolean;
  changelogPagingEndpoint: "available" | "unavailable" | "unknown";
}

/** Probe evidence, proposed profile, and the digest required to save it. */
export interface CommentThreadProbeResult {
  evidence: ProbeEvidence;
  proposal: CommentProfile | null;
  /** sha256 over `{hostname, pattern, propertyKeys}`; `save_profile` requires it for `pattern: "changelog"`. */
  proposal_digest: string | null;
  /** Extraction and property-key lookup failures that must be relayed before saving either proposal shape. */
  warnings: string[];
  reason: string;
}

/** Parameters for explicitly persisting a user-approved site profile. */
export interface CommentThreadSaveProfileParams {
  profile: CommentProfileSaveInput;
  proposal_digest?: string;
}

/** Confirmation returned after atomically saving a site profile. */
export interface CommentThreadSaveResult {
  saved: true;
  path: string;
  hostname: string;
}
