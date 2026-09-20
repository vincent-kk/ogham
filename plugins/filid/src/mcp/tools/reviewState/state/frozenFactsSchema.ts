import { z } from 'zod';

import { FACTS_FILE_STATES } from '../../../../constants/facts.js';

/** One in-project edge a generation froze, as `facts.json` spells it. */
const NormalizedReferenceSchema = z
  .object({
    reference: z.string(),
    kind: z.enum(['static', 'dynamic', 're-export', 'framework']),
    resolvedPath: z.string(),
  })
  .strict();

/** One judgement a generation applied to the references above. */
const NormalizedAdjudicationSchema = z
  .object({
    reference: z.string(),
    resolvedPath: z.string(),
    lineDigest: z.string(),
  })
  .strict();

/**
 * The shape of a generation's frozen facts, checked rather than assumed.
 *
 * The digest says the bytes are the ones the state recorded; it says nothing
 * about their shape. Both files sit in the same tree and are edited by the
 * same hands, so a matching digest over a file somebody rewrote proves only
 * that the two were rewritten together — and a cast would then hand the seal
 * comparison a shape it cannot read.
 */
export const FrozenFactsSchema = z.array(
  z
    .object({
      path: z.string(),
      state: z.nativeEnum(FACTS_FILE_STATES),
      references: z.array(NormalizedReferenceSchema),
      adjudications: z.array(NormalizedAdjudicationSchema),
    })
    .strict(),
);
