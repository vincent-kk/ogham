import { existsSync } from 'node:fs';

import {
  assertNoSymlinkDescendantsSync,
  ensureDirectorySync,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { REVIEW_OPINION_SCHEMA_VERSION } from '../../../../../constants/reviewState.js';
import { renderOpinionSkeleton } from '../../brief/renderOpinionSkeleton.js';
import { renderReviewBrief } from '../../brief/renderReviewBrief.js';
import { renderSessionMarkdown } from '../../brief/renderSessionMarkdown.js';
import { renderVerifyBrief } from '../../brief/renderVerifyBrief.js';
import { materializeUnitDiffs } from '../../diff/materializeUnitDiffs.js';
import type { RenderedReviewUnit } from '../../diff/reviewUnitDiffTypes.js';
import { computeReviewArtifactHash } from '../../hash/computeReviewArtifactHash.js';
import type { LoadedReviewRule } from '../../rules/reviewRuleTypes.js';
import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type {
  ReviewEffort,
  ReviewScopeCandidate,
  ReviewScopeFile,
  ReviewStatePaths,
} from '../../state/reviewStateTypes.js';

/** All state-independent values needed to write prepare's derived artifacts. */
interface WritePreparedReviewArtifactsInput {
  /** Canonical branch-scoped artifact paths. */
  paths: ReviewStatePaths;
  /** Groups awaiting final diff paths and artifact output. */
  groups: readonly ReviewGroup[];
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
  const groups = materialized.map((group) => {
    const candidates = group.candidateIds.map((id) => {
      const candidate = candidatesById.get(id);
      if (!candidate)
        throw new Error(`Review group references unknown candidate: ${id}`);
      return candidate;
    });
    if (group.rounds === 0) {
      if (group.units.length !== 0)
        throw new Error(
          `Candidate-only review group ${group.id} contains units`,
        );
      const opinion = `${JSON.stringify(
        {
          schema: REVIEW_OPINION_SCHEMA_VERSION,
          group: group.id,
          round: 0,
          state: 'COMPLETE',
          sourceHash: input.sourceHash,
          files: [],
          findings: [],
          checked: group.candidateIds,
          gaps: [],
          riskPlan: null,
        },
        null,
        2,
      )}\n`;
      const opinionPath = artifactPath(input.paths, group.opinionPath);
      let persistedOpinion = readUtf8FileIfExistsSync(opinionPath);
      if (!input.preserveOpinions || persistedOpinion === null) {
        writeFileAtomicallySync(opinionPath, opinion);
        persistedOpinion = opinion;
      }
      const sha256 = computeReviewArtifactHash(persistedOpinion);
      const expectedOpinion = persistedOpinion === opinion;
      const retainedOpinion =
        group.validated.review?.complete === true &&
        group.validated.review.round === 0 &&
        group.validated.review.sha256 === sha256;
      const verifyPath = artifactPath(input.paths, group.verifyPath);
      const persistedVerify = readUtf8FileIfExistsSync(verifyPath);
      const priorVerify = group.validated.verify;
      const retainedVerify =
        retainedOpinion &&
        persistedVerify !== null &&
        priorVerify?.reviewSha256 === sha256 &&
        priorVerify.sha256 === computeReviewArtifactHash(persistedVerify);
      const verifyBriefPath = artifactPath(input.paths, group.verifyBriefPath);
      if (!input.onlyMissingArtifacts || !existsSync(verifyBriefPath))
        writeFileAtomicallySync(
          verifyBriefPath,
          renderVerifyBrief({
            group,
            files: input.files,
            findings: [],
            candidates,
            sourceHash: input.sourceHash,
          }),
        );
      return {
        ...group,
        validated: {
          review:
            expectedOpinion || retainedOpinion
              ? { round: 0, sha256, complete: true }
              : null,
          verify: retainedVerify && priorVerify ? { ...priorVerify } : null,
        },
      };
    }

    const briefPath = artifactPath(input.paths, group.briefPath);
    if (
      input.rewriteReviewBriefs ||
      !input.onlyMissingArtifacts ||
      !existsSync(briefPath)
    ) {
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
        renderReviewBrief({
          group,
          files: input.files,
          candidates,
          repositoryRules,
          rules: ruleBodies,
          sourceHash: input.sourceHash,
          baseRef: input.baseRef,
        }),
      );
    }
    const skeletonPath = artifactPath(input.paths, group.skeletonPath);
    if (!input.preserveOpinions || !existsSync(skeletonPath))
      writeFileAtomicallySync(
        skeletonPath,
        renderOpinionSkeleton(group, input.sourceHash),
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
