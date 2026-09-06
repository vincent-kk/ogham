import { z } from 'zod';

import { isReviewInputManifestValid } from '../hash/isReviewInputManifestValid.js';

/** SHA-256 and group capability encoding. */
const digest = z.string().regex(/^[a-f0-9]{64}$/);
/** Closed invalidation vocabulary persisted in decision artifacts. */
const reason = z.enum([
  'source-input-changed',
  'rules-changed',
  'evidence-changed',
  'context-changed',
  'dependency-invalidated',
  'composition-changed',
  'input-unverifiable',
  'artifact-untrusted',
  'policy-incompatible',
  'forced',
]);
/** Host-authoritative context is distinct from untrusted PR text. */
const actorContext = z
  .object({
    mode: z.enum(['isolated', 'repository']),
    userInstructions: z.string(),
  })
  .strict();
/** Query receipts are authored by the context broker. */
const receipt = z
  .object({
    operation: z.enum(['read', 'search', 'exists']),
    path: z.string().min(1),
    revision: z.enum(['head', 'base']),
    query: z.string().optional(),
    digest,
  })
  .strict();
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
  actorContext,
  receipt,
  input,
  origin: z
    .object({ stateHash: digest, sourceHash: digest, inputHash: digest })
    .strict(),
  state: z
    .object({
      version: z.literal(1),
      actorContext,
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
