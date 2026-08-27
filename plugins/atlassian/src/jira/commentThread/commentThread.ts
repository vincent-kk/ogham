import { executeRequest } from "../../core/httpClient/index.js";
import { CommentProfileSaveInputSchema } from "../../types/index.js";
import type {
  CommentProfile,
  CommentThreadProbeParams,
  CommentThreadProbeResult,
  CommentThreadReadParams,
  CommentThreadResult,
  CommentThreadSaveProfileParams,
  CommentThreadSaveResult,
  CommentThreadScanParams,
  CommentThreadScanResult,
  FetchContext,
  ProbeEvidence,
  ThreadCompleteness,
} from "../../types/index.js";
import { extractHostname } from "../../utils/index.js";
import { detectTruncation } from "./operations/detectTruncation.js";
import { digestProposal } from "./operations/digestProposal.js";
import { extractChangelogReplies } from "./operations/extractChangelogReplies.js";
import { mergeCommentThread } from "./operations/mergeCommentThread.js";
import { proposeProfile } from "./operations/proposeProfile.js";
import { validateIssueKey } from "./operations/validateIssueKey.js";
import type { ReplyCandidate } from "./operations/wire.js";
import { loadCommentProfiles } from "./profile/loadCommentProfiles.js";
import type { LoadedCommentProfiles } from "./profile/loadCommentProfiles.js";
import { saveCommentProfile } from "./profile/saveCommentProfile.js";
import { collectReplyProperties } from "./requests/collectReplyProperties.js";
import { fetchAllComments } from "./requests/fetchAllComments.js";
import { fetchChangelog } from "./requests/fetchChangelog.js";
import { fetchCommentPage } from "./requests/fetchCommentPage.js";
import { fetchPropertyKeys } from "./requests/fetchPropertyKeys.js";
import { fetchSearchPage } from "./requests/fetchSearchPage.js";
import { SCAN_CAP, SCAN_DEFAULT, SCAN_PAGE } from "./requests/limits.js";
import { probeChangelogEndpoint } from "./requests/probeChangelogEndpoint.js";
import type { RequestFn } from "./requests/requestFn.js";

/** Every effect the recipe performs, injectable for tests. */
export interface CommentThreadDeps {
  /** Jira transport used by every request helper. */
  request: RequestFn;
  /** Profile loader, injectable so tests never read the user's data directory. */
  loadProfiles: (path?: string) => Promise<LoadedCommentProfiles>;
  /** Explicit profile writer; remote reads never call it. */
  saveProfile: (
    hostname: string,
    profile: CommentProfile,
    path?: string,
  ) => Promise<string>;
  /** Clock used for deterministic profile proposals and saves. */
  now: () => Date;
}

/** Production wiring: real HTTP client and the plugin data directory. */
export const defaultCommentThreadDeps: CommentThreadDeps = {
  request: executeRequest,
  loadProfiles: loadCommentProfiles,
  saveProfile: saveCommentProfile,
  now: () => new Date(),
};

const NO_PROFILE_HINT =
  'No reply-plugin profile for this site. Standard comments only. Run the discovery playbook (skills/jira/tools/comment/reply-plugin.md): ask the user for an issue known to have replies, call mode "probe", and save the proposal only after the user confirms.';

/**
 * Standard comments plus reply-plugin replies merged from the changelog.
 * @param ctx Resolved site; the caller has already rejected Cloud.
 * @param params `issue_key` plus optional single-page controls and comment `expand`.
 * @param deps Transport, profile store and clock.
 * @returns The reconstructed thread with completeness and profile diagnostics.
 * @throws When the comment API itself fails; changelog and property failures degrade into warnings.
 */
export async function readCommentThread(
  ctx: FetchContext,
  params: CommentThreadReadParams,
  deps: CommentThreadDeps = defaultCommentThreadDeps,
): Promise<CommentThreadResult> {
  const issue = validateIssueKey(params.issue_key);
  const hostname = extractHostname(ctx.http.base_url);
  const warnings: string[] = [];

  const loaded = await deps.loadProfiles();
  warnings.push(...loaded.warnings);
  const profile = loaded.sites.get(hostname) ?? null;

  const singlePage =
    params.start_at !== undefined || params.max_results !== undefined;
  let allCommentsComplete = false;
  let comments;
  if (singlePage) {
    comments = (
      await fetchCommentPage(
        ctx,
        deps.request,
        issue,
        params.start_at ?? 0,
        params.max_results ?? 50,
        params.expand,
      )
    ).comments;
  } else {
    const all = await fetchAllComments(ctx, deps.request, issue, params.expand);
    comments = all.comments;
    allCommentsComplete = all.complete;
    if (all.warning) warnings.push(all.warning);
  }

  if (profile === null || profile.pattern !== "changelog") {
    if (profile?.pattern === "unknown")
      warnings.push('profile pattern is "unknown" — re-run probe');
    const result: CommentThreadResult = {
      issue,
      thread: mergeCommentThread(comments, [], new Map()).thread,
      warnings,
      complete: true,
      profile: profile
        ? { pattern: profile.pattern, verifiedAt: profile.verifiedAt }
        : null,
    };
    if (profile === null) result.hint = NO_PROFILE_HINT;
    return result;
  }

  let complete: ThreadCompleteness = true;
  let replies: ReplyCandidate[] = [];
  const { changelog, warning } = await fetchChangelog(ctx, deps.request, issue);
  if (warning) warnings.push(warning);
  if (changelog === null) complete = "unknown";
  else {
    const extracted = extractChangelogReplies(changelog);
    replies = extracted.replies;
    warnings.push(...extracted.warnings);
    const truncation = detectTruncation(changelog);
    if (truncation.truncated) {
      complete = false;
      warnings.push(
        `changelog truncated: ${changelog.histories?.length ?? 0} of ${changelog.total} histories; ${truncation.missing} missing`,
      );
    }
  }

  const pageIds = new Set(comments.map((comment) => comment.id));
  const collected = await collectReplyProperties(
    ctx,
    deps.request,
    profile.propertyKeys,
    replies,
    pageIds,
  );
  warnings.push(...collected.warnings);
  const knownCommentIds =
    singlePage || !allCommentsComplete
      ? new Set([...pageIds, ...replies.map((reply) => reply.rootId)])
      : pageIds;
  const merged = mergeCommentThread(
    comments,
    replies,
    collected.properties,
    knownCommentIds,
  );
  warnings.push(...merged.warnings);

  return {
    issue,
    thread: merged.thread,
    warnings,
    complete,
    profile: { pattern: profile.pattern, verifiedAt: profile.verifiedAt },
  };
}

/**
 * Find issues in a JQL result whose changelog carries reply records.
 * @param ctx Resolved Jira site context.
 * @param params JQL and optional bounded issue count.
 * @param deps Transport and deterministic effect dependencies.
 * @returns Matching issue summaries plus scan completeness and warnings.
 */
export async function scanCommentThreads(
  ctx: FetchContext,
  params: CommentThreadScanParams,
  deps: CommentThreadDeps = defaultCommentThreadDeps,
): Promise<CommentThreadScanResult> {
  const max = Math.min(params.max_issues ?? SCAN_DEFAULT, SCAN_CAP);
  const warnings: string[] = [];
  const issues: CommentThreadScanResult["issues"] = [];
  let scanned = 0;
  let startAt = 0;
  let total: number | undefined;
  let changelogsComplete = true;
  while (scanned < max) {
    const page = await fetchSearchPage(
      ctx,
      deps.request,
      params.jql,
      startAt,
      Math.min(SCAN_PAGE, max - scanned),
    );
    total = page.total;
    if (page.issues.length === 0) break;
    const remaining = max - scanned;
    const pageIssues = page.issues.slice(0, remaining);
    for (const issue of pageIssues) {
      scanned += 1;
      if (issue.changelog === undefined) {
        changelogsComplete = false;
        warnings.push(
          `${issue.key}: changelog missing from expanded search result`,
        );
        continue;
      }
      const extracted = extractChangelogReplies(issue.changelog);
      warnings.push(
        ...extracted.warnings.map((item) => `${issue.key}: ${item}`),
      );
      if (extracted.replies.length > 0)
        issues.push({
          key: issue.key,
          replyCount: extracted.replies.length,
          truncated: detectTruncation(issue.changelog).truncated,
        });
    }
    const nextStartAt = startAt + page.issues.length;
    if (total !== undefined && nextStartAt >= total) break;
    startAt = nextStartAt;
  }
  return {
    scanned,
    issues,
    complete: changelogsComplete && total !== undefined && scanned >= total,
    warnings,
  };
}

/**
 * Observe one issue and propose a profile without writing it.
 * @param ctx Resolved Jira site context.
 * @param params Representative issue key selected by the user.
 * @param deps Transport and deterministic effect dependencies.
 * @returns Probe evidence, a possible profile proposal, its digest, and rationale.
 * @throws When the comment API or changelog cannot be read.
 */
export async function probeCommentThread(
  ctx: FetchContext,
  params: CommentThreadProbeParams,
  deps: CommentThreadDeps = defaultCommentThreadDeps,
): Promise<CommentThreadProbeResult> {
  const sample = validateIssueKey(params.sample_issue_key);
  const hostname = extractHostname(ctx.http.base_url);
  const page = await fetchCommentPage(ctx, deps.request, sample, 0, 50);
  const { changelog, warning } = await fetchChangelog(
    ctx,
    deps.request,
    sample,
  );
  if (changelog === null) throw new Error(warning ?? "changelog unavailable");
  const extracted = extractChangelogReplies(changelog);
  const { replies } = extracted;
  const roots = [...new Set(replies.map((reply) => reply.rootId))];
  const keyResults = await Promise.all(
    roots.slice(0, 3).map((id) => fetchPropertyKeys(ctx, deps.request, id)),
  );
  const propertyWarnings = keyResults.flatMap(({ warning: keyWarning }) =>
    keyWarning === null ? [] : [keyWarning],
  );
  const warnings = [...extracted.warnings, ...propertyWarnings];
  const evidence: ProbeEvidence = {
    sampleIssue: sample,
    standardTotal: page.total ?? page.comments.length,
    commentItems: replies.length,
    distinctRoots: roots.length,
    propertyKeys: [
      ...new Set(keyResults.flatMap(({ keys: propertyKeys }) => propertyKeys)),
    ].sort(),
    changelogTruncated: detectTruncation(changelog).truncated,
    changelogPagingEndpoint: await probeChangelogEndpoint(
      ctx,
      deps.request,
      sample,
    ),
  };
  const { proposal, reason } = proposeProfile(evidence, deps.now());
  return {
    evidence,
    proposal,
    proposal_digest: proposal ? digestProposal(hostname, proposal) : null,
    warnings,
    reason:
      propertyWarnings.length === 0
        ? reason
        : `${propertyWarnings.join("; ")}. ${reason}`,
  };
}

/**
 * Persist a profile the user confirmed.
 * @param ctx Resolved Jira site context used to bind the profile digest.
 * @param params Validated profile and, for changelog profiles, the probe digest.
 * @param deps Profile writer and deterministic clock.
 * @returns Saved path and hostname confirmation.
 * @throws When a changelog proposal digest does not match this site and profile.
 */
export async function saveCommentThreadProfile(
  ctx: FetchContext,
  params: CommentThreadSaveProfileParams,
  deps: CommentThreadDeps = defaultCommentThreadDeps,
): Promise<CommentThreadSaveResult> {
  const hostname = extractHostname(ctx.http.base_url);
  const profile = CommentProfileSaveInputSchema.parse(params.profile);
  if (
    profile.pattern === "changelog" &&
    params.proposal_digest !== digestProposal(hostname, profile)
  )
    throw new Error(
      'proposal_digest does not match this site and profile; run mode "probe" again',
    );
  const stored: CommentProfile = {
    ...profile,
    verifiedAt: deps.now().toISOString(),
  };
  const path = await deps.saveProfile(hostname, stored);
  return { saved: true, path, hostname };
}
