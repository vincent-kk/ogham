/**
 * @file state.ts
 * @description Zod schemas for imbas pipeline state (state.json)
 * @see .metadata/imbas/storage.md §3 — refine → estimate(skippable) → split
 */
import { z } from 'zod';

// --- Enums ---

export const PhaseStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'skipped',
  'escaped',
]);
export type PhaseStatus = z.infer<typeof PhaseStatusSchema>;

export const PhaseNameSchema = z.enum(['refine', 'estimate', 'split']);
export type PhaseName = z.infer<typeof PhaseNameSchema>;

export const ValidateResultSchema = z.enum([
  'PASS',
  'PASS_WITH_WARNINGS',
  'BLOCKED',
]);
export type ValidateResult = z.infer<typeof ValidateResultSchema>;

export const EscapeCodeSchema = z.enum([
  'E2-1',
  'E2-2',
  'E2-3',
  'EC-1',
  'EC-2',
]);
export type EscapeCode = z.infer<typeof EscapeCodeSchema>;

// --- Phase Data ---

export const RefinePhaseSchema = z.object({
  status: PhaseStatusSchema,
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  result: ValidateResultSchema.nullable(),
  blocking_issues: z.number().int().nonnegative().default(0),
  warning_issues: z.number().int().nonnegative().default(0),
});
export type RefinePhase = z.infer<typeof RefinePhaseSchema>;

export const EstimatePhaseSchema = z.object({
  status: PhaseStatusSchema,
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  estimated_manday: z.number().nonnegative().nullable().default(null),
});
export type EstimatePhase = z.infer<typeof EstimatePhaseSchema>;

export const SplitPhaseSchema = z.object({
  status: PhaseStatusSchema,
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  stories_created: z.number().int().nonnegative().default(0),
  pending_review: z.boolean().default(true),
  escape_code: EscapeCodeSchema.nullable().default(null),
});
export type SplitPhase = z.infer<typeof SplitPhaseSchema>;

export const PhasesSchema = z.object({
  refine: RefinePhaseSchema,
  estimate: EstimatePhaseSchema,
  split: SplitPhaseSchema,
});
export type Phases = z.infer<typeof PhasesSchema>;

// --- RunState ---

export const RunStateSchema = z.object({
  run_id: z.string(),
  project_ref: z.string(),
  epic_ref: z.string().nullable().default(null),
  source_issue_ref: z.string().nullable().default(null),
  source_file: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  current_phase: PhaseNameSchema,
  phases: PhasesSchema,
});
export type RunState = z.infer<typeof RunStateSchema>;

// --- Transition Action Schemas (discriminated union) ---

export const StartPhaseActionSchema = z.object({
  project_ref: z.string(),
  run_id: z.string(),
  action: z.literal('start_phase'),
  phase: PhaseNameSchema,
  project_root: z.string().optional(),
});

export const CompletePhaseActionSchema = z.object({
  project_ref: z.string(),
  run_id: z.string(),
  action: z.literal('complete_phase'),
  phase: PhaseNameSchema,
  result: ValidateResultSchema.optional(),
  blocking_issues: z.number().int().nonnegative().optional(),
  warning_issues: z.number().int().nonnegative().optional(),
  estimated_manday: z.number().nonnegative().optional(),
  pending_review: z.boolean().optional(),
  stories_created: z.number().int().nonnegative().optional(),
  project_root: z.string().optional(),
});

export const EscapePhaseActionSchema = z.object({
  project_ref: z.string(),
  run_id: z.string(),
  action: z.literal('escape_phase'),
  phase: z.literal('split'),
  escape_code: EscapeCodeSchema,
  project_root: z.string().optional(),
});

export const SkippablePhaseSchema = z.enum(['estimate']);

export const SkipPhasesActionSchema = z.object({
  project_ref: z.string(),
  run_id: z.string(),
  action: z.literal('skip_phases'),
  phases: z.array(SkippablePhaseSchema).min(1),
  project_root: z.string().optional(),
});

export const RunTransitionSchema = z.discriminatedUnion('action', [
  StartPhaseActionSchema,
  CompletePhaseActionSchema,
  EscapePhaseActionSchema,
  SkipPhasesActionSchema,
]);
export type RunTransition = z.infer<typeof RunTransitionSchema>;
