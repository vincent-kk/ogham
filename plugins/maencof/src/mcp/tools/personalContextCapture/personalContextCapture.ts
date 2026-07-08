import { z } from 'zod';

import {
  DUE_PATTERN,
  KIND_PATTERN,
  MAX_EVIDENCE_CHARS,
  MAX_KIND_CHARS,
  MAX_LABEL_CHARS,
  MAX_STATE_NOTE_CHARS,
  MAX_STATE_TTL_DAYS,
  MAX_TOPIC_NOTE_CHARS,
  MIN_STATE_TTL_DAYS,
  SUGGESTED_STATE_KINDS,
  SUGGESTED_TOPIC_KINDS,
} from '../../../constants/personalContext.js';
import {
  type PersonalContextMutationResult,
  applyPersonalContextMutation,
} from '../../../core/personalContext/index.js';
import { PERSONAL_STATE_INTENSITIES } from '../../../types/personalContext.js';

/**
 * 플랫 스키마 유지 — MCP SDK는 ZodRawShape를 요구하므로 discriminated union /
 * superRefine을 쓸 수 없다. target/action 조합별 필수 필드는 핸들러가 검증한다.
 */
export const personalContextCaptureInputSchema = z.object({
  target: z
    .enum(['state', 'topic'])
    .describe(
      'state = transient user condition (mood/health/situation); topic = recent personal topic (plan/concern/relationship/work/...)',
    ),
  action: z
    .enum(['capture', 'resolve'])
    .optional()
    .describe(
      'capture (default) = upsert; same-label recapture reinforces the state / touches the topic instead of duplicating. resolve = close the entry (state: removed, topic: marked resolved).',
    ),
  label: z
    .string()
    .min(1)
    .max(MAX_LABEL_CHARS)
    .describe(
      'Entry label; its normalized slug is the dedup key — reuse the same label to reinforce or resolve.',
    ),
  kind: z
    .string()
    .regex(KIND_PATTERN)
    .max(MAX_KIND_CHARS)
    .optional()
    .describe(
      `Free lowercase-kebab category (required for capture). Suggested for states: ${SUGGESTED_STATE_KINDS.join(', ')}. Suggested for topics: ${SUGGESTED_TOPIC_KINDS.join(', ')}.`,
    ),
  intensity: z
    .enum(PERSONAL_STATE_INTENSITIES)
    .optional()
    .describe('State strength (required for state capture).'),
  note: z
    .string()
    .max(MAX_TOPIC_NOTE_CHARS)
    .optional()
    .describe(
      `Short description (state ≤ ${MAX_STATE_NOTE_CHARS} chars, topic ≤ ${MAX_TOPIC_NOTE_CHARS} chars).`,
    ),
  evidence: z
    .string()
    .min(1)
    .max(MAX_EVIDENCE_CHARS)
    .optional()
    .describe(
      'Date + conversational cue evidencing the state (required for state capture — never record a state without evidence).',
    ),
  ttlDays: z
    .number()
    .int()
    .min(MIN_STATE_TTL_DAYS)
    .max(MAX_STATE_TTL_DAYS)
    .optional()
    .describe(
      'State validity in days (default 14). States expire unless reinforced — permanent traits belong in L1, not here.',
    ),
  due: z
    .string()
    .regex(DUE_PATTERN)
    .optional()
    .describe(
      'YYYY-MM-DD deadline (topic only). Overdue topics auto-resolve after a grace period.',
    ),
});

export type PersonalContextCaptureArgs = z.infer<
  typeof personalContextCaptureInputSchema
>;

export async function handlePersonalContextCapture(
  vaultPath: string,
  args: PersonalContextCaptureArgs,
): Promise<PersonalContextMutationResult> {
  const action = args.action ?? 'capture';
  if (action === 'resolve')
    return applyPersonalContextMutation(vaultPath, {
      target: args.target,
      action: 'resolve',
      label: args.label,
    });

  if (!args.kind)
    return invalid(
      'kind is required for capture — pick a lowercase-kebab word',
    );

  if (args.target === 'state') {
    if (!args.intensity)
      return invalid(
        'intensity (low|medium|high) is required for state capture',
      );
    if (!args.evidence)
      return invalid(
        'evidence is required for state capture — cite the date + conversational cue',
      );
    if (args.due !== undefined)
      return invalid('due applies to topic captures only');
    if (args.note !== undefined && args.note.length > MAX_STATE_NOTE_CHARS)
      return invalid(`state note must be ≤ ${MAX_STATE_NOTE_CHARS} chars`);
    return applyPersonalContextMutation(vaultPath, {
      target: 'state',
      action: 'capture',
      state: {
        label: args.label,
        kind: args.kind,
        intensity: args.intensity,
        evidence: args.evidence,
        ...(args.note !== undefined && { note: args.note }),
        ...(args.ttlDays !== undefined && { ttlDays: args.ttlDays }),
      },
    });
  }

  if (
    args.intensity !== undefined ||
    args.evidence !== undefined ||
    args.ttlDays !== undefined
  )
    return invalid('intensity/evidence/ttlDays apply to state captures only');
  return applyPersonalContextMutation(vaultPath, {
    target: 'topic',
    action: 'capture',
    topic: {
      label: args.label,
      kind: args.kind,
      ...(args.note !== undefined && { note: args.note }),
      ...(args.due !== undefined && { due: args.due }),
    },
  });
}

function invalid(reason: string): PersonalContextMutationResult {
  return { success: false, message: `Invalid capture: ${reason}.` };
}
