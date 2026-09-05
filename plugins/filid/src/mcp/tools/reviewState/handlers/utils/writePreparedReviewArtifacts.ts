import { existsSync } from 'node:fs';

import {
  assertNoSymlinkDescendantsSync,
  ensureDirectorySync,
  resolveContainedPath,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { REVIEW_STATE_ERROR_MESSAGES } from '../../../../../constants/reviewState.js';
import { renderOpinionSkeleton } from '../../brief/renderOpinionSkeleton.js';
import { renderReviewBrief } from '../../brief/renderReviewBrief.js';
import { renderSessionMarkdown } from '../../brief/renderSessionMarkdown.js';
import { renderVerifyBrief } from '../../brief/renderVerifyBrief.js';
import { materializeUnitDiffs } from '../../diff/materializeUnitDiffs.js';
import { readInlineReviewDiffs } from '../../diff/readInlineReviewDiffs.js';
import type { RenderedReviewUnit } from '../../diff/reviewUnitDiffTypes.js';
import { writeAutoVerifyOpinion } from '../../handoff/utils/writeAutoVerifyOpinion.js';
import { writeCandidateOnlyReviewOpinion } from '../../handoff/utils/writeCandidateOnlyReviewOpinion.js';
import type { LoadedReviewRule } from '../../rules/reviewRuleTypes.js';
import type { ReviewHandoffSeed } from '../../scope/reviewHandoffSeedSchema.js';
import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type {
  ReviewEffort,
  ReviewScopeCandidate,
  ReviewScopeFile,
  ReviewStatePaths,
} from '../../state/reviewStateTypes.js';

/** All state-independent values needed to write prepare's derived artifacts. */
interface WritePreparedReviewArtifactsInput {
  /** Verbatim actor methods, needed only when a brief must be rendered. */
  actorMethods: { reviewer: string; verifier: string } | null;
  /** Sanitized untrusted summary for the session and reviewer brief. */
  changeContext: string;
  /** Validated untrusted claims rendered only when a reviewer brief is written. */
  handoff: ReviewHandoffSeed | null;
  /** Canonical branch-scoped artifact paths. */
  paths: ReviewStatePaths;
  /** Groups awaiting final diff paths and artifact output. */
  groups: readonly ReviewGroup[];
  /** Prior groups used to identify reviews reopened by an effort change. */
  previousGroups: readonly ReviewGroup[];
  /** Rendered unit bytes keyed by path and chunk identity. */
  renderedUnits: readonly RenderedReviewUnit[];
  /** Complete changed-file roster with final rule selections. */
  files: readonly ReviewScopeFile[];
  /** FCA candidates assigned by group candidate identifiers. */
  candidates: readonly ReviewScopeCandidate[];
  /** Active built-in and repository rule bodies available to briefs. */
  activeRules: readonly LoadedReviewRule[];
  /** Immutable committed-source identity. */
  sourceHash: string;
  /** User-selected base reference recorded in reviewer briefs. */
  baseRef: string;
  /** Source branch recorded in the orchestration session. */
  branchName: string;
  /** Effective reviewer effort recorded in the session. */
  effort: ReviewEffort;
  /** Shared ISO timestamp for the prepared state and session. */
  createdAt: string;
  /** Whether existing diff, brief, and session bytes must remain unchanged. */
  onlyMissingArtifacts: boolean;
  /** Whether every existing opinion file must remain unchanged. */
  preserveOpinions: boolean;
  /** Whether existing reviewer briefs must be rendered with current group data. */
  rewriteReviewBriefs?: boolean;
  /** Whether the session document must be rendered with current effort data. */
  rewriteSession?: boolean;
}

/**
 * Resolve and guard one review-directory-relative artifact path.
 *
 * @param paths Canonical branch-scoped review paths.
 * @param relativePath Review-directory-relative artifact path from state.
 * @returns Absolute contained path after descendant symlink validation.
 * @throws When the resolved target escapes containment through a symlink.
 */
function artifactPath(paths: ReviewStatePaths, relativePath: string): string {
  const absolutePath = resolveContainedPath(
    paths.reviewDirectory,
    relativePath,
  );
  assertNoSymlinkDescendantsSync(paths.reviewDirectory, absolutePath);
  return absolutePath;
}

/**
 * Select the reviewer round that prepare must hand back to an actor.
 * @param group Retuned group whose current validation may be incomplete.
 * @param previous Same-identity group before the effort change.
 * @returns The newly required round only when a complete review was reopened.
 */
function resolvePreparedReviewRound(
  group: ReviewGroup,
  previous: ReviewGroup | undefined,
): number {
  const review = group.validated.review;
  if (previous?.validated.review?.complete && review?.complete === false)
    return review.round + 1;
  return 1;
}

/**
 * Materialize prepare artifacts without overwriting preserved resume outputs.
 * @param input Groups, rendered units, rule bodies, scope facts, and write policy.
 * @returns Groups carrying final diff paths and candidate-only validation hashes.
 * @throws When canonical group references or preserved artifacts are inconsistent.
 */
export function writePreparedReviewArtifacts(
  input: WritePreparedReviewArtifactsInput,
): ReviewGroup[] {
  ensureDirectorySync(input.paths.reviewDirectory);
  ensureDirectorySync(input.paths.opinionsDirectory);
  ensureDirectorySync(input.paths.briefsDirectory);
  const needsDiffMaterialization =
    !input.onlyMissingArtifacts ||
    input.groups.some((group) =>
      group.units.some(
        (unit) => !existsSync(artifactPath(input.paths, unit.diffPath)),
      ),
    );
  const materialized = needsDiffMaterialization
    ? materializeUnitDiffs({
        reviewDirectory: input.paths.reviewDirectory,
        groups: input.groups,
        renderedUnits: input.renderedUnits,
        onlyMissing: input.onlyMissingArtifacts,
      })
    : [...input.groups];
  const filesByPath = new Map(input.files.map((file) => [file.path, file]));
  const candidatesById = new Map(
    input.candidates.map((candidate) => [candidate.id, candidate]),
  );
  const rulesById = new Map(input.activeRules.map((rule) => [rule.id, rule]));
  const previousGroupsById = new Map(
    input.previousGroups.map((group) => [group.id, group]),
  );
  const groups = materialized.map((group) => {
    const candidates = group.candidateIds.map((id) => {
      const candidate = candidatesById.get(id);
      if (!candidate)
        throw new Error(`Review group references unknown candidate: ${id}`);
      return candidate;
    });
    if (group.rounds === 0) {
      const prepared = writeCandidateOnlyReviewOpinion(
        input.paths,
        group,
        input.sourceHash,
        input.preserveOpinions,
      );
      const verifyBriefPath = artifactPath(input.paths, group.verifyBriefPath);
      if (!input.onlyMissingArtifacts || !existsSync(verifyBriefPath)) {
        if (!input.actorMethods)
          throw new Error(REVIEW_STATE_ERROR_MESSAGES.ACTOR_METHODS_REQUIRED);
        writeFileAtomicallySync(
          verifyBriefPath,
          renderVerifyBrief({
            verifierMethod: input.actorMethods.verifier,
            diffs: [],
            group,
            files: input.files,
            findings: [],
            sourceHash: input.sourceHash,
          }),
        );
      }
      return prepared.validated.review && !prepared.validated.verify
        ? writeAutoVerifyOpinion(input.paths, prepared, input.sourceHash)
        : prepared;
    }

    const reviewRound = resolvePreparedReviewRound(
      group,
      previousGroupsById.get(group.id),
    );
    const briefPath = artifactPath(input.paths, group.briefPath);
    if (
      input.rewriteReviewBriefs ||
      !input.onlyMissingArtifacts ||
      !existsSync(briefPath)
    ) {
      if (!input.actorMethods)
        throw new Error(REVIEW_STATE_ERROR_MESSAGES.ACTOR_METHODS_REQUIRED);
      const groupFiles = group.units.map((unit) => {
        const file = filesByPath.get(unit.path);
        if (!file)
          throw new Error(`Review unit is absent from roster: ${unit.path}`);
        return file;
      });
      const repositoryRules = [
        ...new Set(groupFiles.flatMap((file) => file.repositoryRules)),
      ];
      const ruleBodies = [
        ...new Set(groupFiles.flatMap((file) => file.rules)),
      ].map((id) => {
        const rule = rulesById.get(id);
        if (!rule) throw new Error(`Review rule body is missing for "${id}".`);
        return { id, body: rule.body };
      });
      writeFileAtomicallySync(
        briefPath,
        renderReviewBrief(
          {
            reviewerMethod: input.actorMethods.reviewer,
            changeContext: input.changeContext,
            handoff: input.handoff,
            diffs: readInlineReviewDiffs(input.paths, group),
            group,
            files: input.files,
            candidates,
            repositoryRules,
            rules: ruleBodies,
            sourceHash: input.sourceHash,
            baseRef: input.baseRef,
          },
          reviewRound,
        ),
      );
    }
    const skeletonPath = artifactPath(
      input.paths,
      reviewRound === 1
        ? group.skeletonPath
        : `opinions/review-${group.id}.r${String(reviewRound)}.json`,
    );
    if (
      !input.preserveOpinions ||
      (!group.validated.review && !existsSync(skeletonPath))
    )
      writeFileAtomicallySync(
        skeletonPath,
        renderOpinionSkeleton(group, input.sourceHash, reviewRound),
      );
    return group;
  });

  if (
    input.rewriteSession ||
    !input.onlyMissingArtifacts ||
    !existsSync(input.paths.sessionPath)
  )
    writeFileAtomicallySync(
      input.paths.sessionPath,
      renderSessionMarkdown({
        changeContext: input.changeContext,
        branchName: input.branchName,
        baseRef: input.baseRef,
        sourceHash: input.sourceHash,
        reviewDirectory: input.paths.reviewDirectory,
        effort: input.effort,
        createdAt: input.createdAt,
        files: input.files,
        groups,
      }),
    );
  return groups;
}
