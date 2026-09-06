import { z } from 'zod';

import type { ReviewFinding } from '../opinion/reviewOpinionTypes.js';

/** Persisted earlier claims retain their original IDs and require complete evidence fields. */
export const ReviewPriorFindingSchema: z.ZodType<ReviewFinding> = z
  .object({
    id: z.string().regex(/^R\d{2,}-\d{3,}$/),
    severity: z.enum(['error', 'warning']),
    category: z.enum([
      'bug',
      'security',
      'performance',
      'maintainability',
      'test',
      'documentation',
      'contract',
      'structure',
      'verification',
    ]),
    path: z.string().min(1),
    existingCode: z.string().min(1),
    lines: z.string(),
    inDiff: z.boolean(),
    rule: z.string().min(1),
    message: z.string().min(1),
    evidence: z.string().min(1),
    consequence: z.string().min(1),
    recommendedAction: z.string().min(1),
  })
  .strict();
