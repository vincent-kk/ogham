import { z } from 'zod';

/** Bounded non-executable advice admitted at reviewer and verifier JSON boundaries. */
export const REVIEW_RESOLUTION_SCHEMA = z
  .object({
    question: z.string().trim().min(1).max(240),
    evidenceNeeded: z.array(z.string().trim().min(1).max(300)).min(1).max(5),
    nextAction: z.string().trim().min(1).max(600),
    doneWhen: z.string().trim().min(1).max(600),
    suggestedOwner: z.enum(['agent', 'human', 'unknown']),
    humanReason: z.string().trim().min(1).max(400).optional(),
    options: z
      .array(z.string().trim().min(1).max(300))
      .min(2)
      .max(5)
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.suggestedOwner === 'human' &&
      (!value.options ||
        value.options.some(
          (option, index) => value.options!.indexOf(option) !== index,
        ))
    )
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Human decision advice requires distinct concrete options.',
      });
    if (value.suggestedOwner === 'human' && value.humanReason === undefined)
      context.addIssue({
        code: 'custom',
        path: ['humanReason'],
        message: 'Human decision advice requires a reason.',
      });
  });
