import { z } from 'zod';

import { isReviewInputManifestValid } from '../hash/isReviewInputManifestValid.js';

/** SHA-256 input and artifact identity encoding. */
const digest = z.string().regex(/^[a-f0-9]{64}$/);
/** Closed invalidation vocabulary persisted in decision artifacts. */
const reason = z.enum([
  'source-input-changed',
  'rules-changed',
  'evidence-changed',
  'context-changed',
  'composition-changed',
  'input-unverifiable',
  'artifact-untrusted',
  'policy-incompatible',
  'forced',
]);
/** Every manifest claim must reproduce its persisted digests. */
const input = z
  .object({
    schemaVersion: z.literal(1),
    assignment: z.array(
      z
        .object({
          path: z.string().min(1),
          change: z.enum(['A', 'M', 'D']),
          chunk: z
            .object({
              index: z.number().int().positive(),
              total: z.number().int().positive(),
            })
            .strict()
            .nullable(),
          owner: z.string().nullable(),
        })
        .strict(),
    ),
    sourceHash: digest,
    rulesHash: digest,
    evidenceHash: digest,
    contextHash: digest.nullable(),
    policyHash: digest,
    groupKey: digest,
    preparedInputHash: digest,
  })
  .strict()
  .refine(isReviewInputManifestValid);
/** Counts form a bounded operational summary, never a token estimate. */
const summary = z
  .object({
    reusedFiles: z.number().int().nonnegative(),
    reviewFiles: z.number().int().nonnegative(),
    reusedGroups: z.number().int().nonnegative(),
    rerunGroups: z.number().int().nonnegative(),
    newGroups: z.number().int().nonnegative(),
    removedGroups: z.number().int().nonnegative(),
    bookkeepingGroups: z.number().int().nonnegative(),
    remainingMaxReviewerHandoffs: z.number().int().nonnegative(),
  })
  .strict();
/** Related schemas share one encoding at the state and public input boundaries. */
export const ReviewIncrementalSchemas = {
  digest,
  input,
  origin: z
    .object({
      stateHash: digest,
      sourceHash: digest,
      inputHash: digest,
      paths: z.record(z.string()).optional(),
    })
    .strict(),
  state: z
    .object({
      version: z.literal(2),
      headCommit: z.string().optional(),
      userInstructions: z.string(),
      changeContext: z.string().nullable(),
      pluginRoot: z.string().nullable(),
      environmentHash: digest,
      decisions: z.array(
        z
          .object({
            group: z.string(),
            previousGroup: z.string().nullable(),
            disposition: z.enum(['reused', 'rerun', 'new', 'bookkeeping']),
            reasons: z.array(reason),
          })
          .strict(),
      ),
      summary,
    })
    .strict(),
};
