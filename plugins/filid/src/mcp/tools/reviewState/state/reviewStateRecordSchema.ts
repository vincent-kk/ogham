import { z } from 'zod';

import { ANALYSIS_CERTAINTIES } from '../../../../constants/analysisCertainties.js';
import {
  REVIEW_STATE_PHASES,
  REVIEW_STATE_SCHEMA_VERSION,
  WORKTREE_DISPOSITIONS,
} from '../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';

import { hasCanonicalReviewGroupPaths } from './hasCanonicalReviewGroupPaths.js';
import type { ReviewStateRecord } from './reviewStateTypes.js';

/** Strict persisted range schema for one changed hunk. */
const ReviewHunkSchema = z
  .object({
    oldStart: z.number().int().nonnegative(),
    oldEnd: z.number().int().nonnegative(),
    newStart: z.number().int().nonnegative(),
    newEnd: z.number().int().nonnegative(),
  })
  .strict();

/** Strict persisted chunk identity schema. */
const ReviewChunkSchema = z
  .object({
    index: z.number().int().positive(),
    total: z.number().int().positive(),
  })
  .strict();

/** Strict persisted review-unit schema. */
const ReviewUnitSchema = z
  .object({
    path: z.string(),
    change: z.enum(['A', 'M', 'D']),
    chunk: ReviewChunkSchema.nullable(),
    churn: z.number().int().nonnegative(),
    hunks: z.array(ReviewHunkSchema),
    diffPath: z.string(),
  })
  .strict();

/** Strict review artifact-validation handoff schema. */
const ReviewValidationSchema = z
  .object({
    review: z
      .object({
        round: z.number().int().nonnegative(),
        sha256: z.string(),
        complete: z.boolean(),
      })
      .strict()
      .nullable(),
    verify: z
      .object({
        sha256: z.string(),
        reviewSha256: z.string(),
      })
      .strict()
      .nullable(),
  })
  .strict();

/** Strict persisted review-group schema. */
const ReviewGroupSchema = z
  .object({
    id: z.string().regex(/^\d{2,}$/),
    units: z.array(ReviewUnitSchema),
    churn: z.number().int().nonnegative(),
    planRequired: z.boolean(),
    dependsOn: z.array(z.string()),
    candidateIds: z.array(z.string()),
    briefPath: z.string(),
    skeletonPath: z.string(),
    opinionPath: z.string(),
    verifyBriefPath: z.string(),
    verifyPath: z.string(),
    rounds: z.number().int().nonnegative(),
    validated: ReviewValidationSchema,
  })
  .strict()
  .refine(hasCanonicalReviewGroupPaths);

/** Strict persisted changed-file schema. */
const ReviewScopeFileSchema = z
  .object({
    path: z.string(),
    change: z.enum(['A', 'M', 'D']),
    insertions: z.number().int().nonnegative(),
    deletions: z.number().int().nonnegative(),
    binary: z.boolean(),
    role: z.enum([
      'source',
      'verification',
      'document',
      'generated',
      'binary',
      'lockfile',
    ]),
    owner: z.string().nullable(),
    skipReason: z.string().nullable(),
    rules: z.array(z.string()),
    repositoryRules: z.array(z.string()),
  })
  .strict();

/** Strict persisted FCA candidate schema. */
const ReviewScopeCandidateSchema = z
  .object({
    id: z.string(),
    source: z.enum(['structure', 'verification']),
    scope: z.string(),
    category: z.enum(['contract', 'structure', 'verification']),
    severity: z.enum(['error', 'warning']),
    path: z.string(),
    rule: z.string(),
    message: z.string(),
    certainty: z.nativeEnum(ANALYSIS_CERTAINTIES).optional(),
  })
  .strict();

/** Strict persisted informational FCA observation schema. */
const ReviewScopeInformationalSchema = z
  .object({
    source: z.enum(['structure', 'verification']),
    scope: z.string(),
    category: z.enum(['contract', 'structure', 'verification']),
    severity: z.literal('info'),
    path: z.string(),
    rule: z.string(),
    message: z.string(),
    certainty: z.nativeEnum(ANALYSIS_CERTAINTIES).optional(),
  })
  .strict();

/** Strict persisted prepare-scope snapshot schema. */
const ReviewScopeSchema = z
  .object({
    snapshotHash: z.string(),
    evidenceComplete: z.boolean(),
    worktree: z.nativeEnum(WORKTREE_DISPOSITIONS),
    dirtyPaths: z.array(z.string()),
    statuses: z
      .object({
        structure: z.nativeEnum(TOOL_STATUSES),
        verification: z.nativeEnum(TOOL_STATUSES),
      })
      .strict(),
    files: z.array(ReviewScopeFileSchema),
    candidates: z.array(ReviewScopeCandidateSchema),
    informational: z.array(ReviewScopeInformationalSchema),
    outOfScopeCount: z.number().int().nonnegative(),
    infoCount: z.number().int().nonnegative(),
  })
  .strict();

/** Complete strict schema for the canonical review-state v2 record. */
export const ReviewStateRecordSchema: z.ZodType<ReviewStateRecord> = z
  .object({
    schemaVersion: z.literal(REVIEW_STATE_SCHEMA_VERSION),
    projectRoot: z.string(),
    branchName: z.string(),
    normalizedBranch: z.string(),
    baseRef: z.string(),
    baseCommit: z.string(),
    sourceHash: z.string(),
    fileHashes: z.record(z.string()),
    phase: z.nativeEnum(REVIEW_STATE_PHASES),
    preparedAt: z.string(),
    sealedAt: z.string().optional(),
    effort: z.enum(['low', 'medium', 'high']),
    groups: z.array(ReviewGroupSchema),
    scope: ReviewScopeSchema,
    verdict: z.enum(['APPROVED', 'REQUEST_CHANGES', 'INCONCLUSIVE']).nullable(),
  })
  .strict()
  .superRefine((state, context) => {
    if (
      state.phase === REVIEW_STATE_PHASES.PREPARED &&
      (state.verdict !== null || state.sealedAt !== undefined)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'prepared state cannot contain seal outputs',
      });

    if (
      state.phase === REVIEW_STATE_PHASES.SEALED &&
      (state.verdict === null || state.sealedAt === undefined)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sealed state requires verdict and sealedAt',
      });
  });
