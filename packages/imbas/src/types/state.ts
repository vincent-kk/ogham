/**
 * @file types/state.ts
 * @description Zod schemas for imbas pipeline state (state.json)
 * @see SPEC-state.md §4, SPEC-tools.md §2.3
 */

import { z } from 'zod';

// --- Enums ---

export const PhaseStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'escaped']);
export type PhaseStatus = z.infer<typeof PhaseStatusSchema>;

export const PhaseNameSchema = z.enum(['validate', 'split', 'devplan']);
export type PhaseName = z.infer<typeof PhaseNameSchema>;

export const ValidateResultSchema = z.enum(['PASS', 'PASS_WITH_WARNINGS', 'BLOCKED']);
export type ValidateResult = z.infer<typeof ValidateResultSchema>;

export const EscapeCodeSchema = z.enum(['E2-1', 'E2-2', 'E2-3', 'EC-1', 'EC-2']);
export type EscapeCode = z.infer<typeof EscapeCodeSchema>;

// --- Phase Data ---

export const ValidatePhaseSchema = z.object({
  status: PhaseStatusSchema,
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  output: z.literal('validation-report.md'),
  result: ValidateResultSchema.nullable(),
  blocking_issues: z.number().int().nonnegative().default(0),
  warning_issues: z.number().int().nonnegative().default(0),
});
export type ValidatePhase = z.infer<typeof ValidatePhaseSchema>;

export const SplitPhaseSchema = z.object({
  status: PhaseStatusSchema,
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  output: z.literal('stories-manifest.json'),
  stories_created: z.number().int().nonnegative().default(0),
  pending_review: z.boolean().default(true),
  escape_code: EscapeCodeSchema.nullable().default(null),
});
export type SplitPhase = z.infer<typeof SplitPhaseSchema>;

export const DevplanPhaseSchema = z.object({
  status: PhaseStatusSchema,
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  output: z.literal('devplan-manifest.json'),
  pending_review: z.boolean().default(true),
});
export type DevplanPhase = z.infer<typeof DevplanPhaseSchema>;

export const PhasesSchema = z.object({
  validate: ValidatePhaseSchema,
  split: SplitPhaseSchema,
  devplan: DevplanPhaseSchema,
});
export type Phases = z.infer<typeof PhasesSchema>;

// --- RunState ---

export const RunStateSchema = z.object({
  run_id: z.string(),
  project_ref: z.string(),
  epic_ref: z.string().nullable().default(null),
  source_file: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  current_phase: PhaseNameSchema,
  phases: PhasesSchema,
  metadata: z.object({
    skipped_phases: z.array(PhaseNameSchema).optional(),
  }).optional(),
});
export type RunState = z.infer<typeof RunStateSchema>;

// --- Transition Action Schemas (discriminated union) ---

export const StartPhaseActionSchema = z.object({
  project_ref: z.string(),
  run_id: z.string(),
  action: z.literal('start_phase'),
  phase: PhaseNameSchema,
});

export const CompletePhaseActionSchema = z.object({
  project_ref: z.string(),
  run_id: z.string(),
  action: z.literal('complete_phase'),
  phase: PhaseNameSchema,
  result: ValidateResultSchema.optional(),
  blocking_issues: z.number().int().nonnegative().optional(),
  warning_issues: z.number().int().nonnegative().optional(),
  pending_review: z.boolean().optional(),
  stories_created: z.number().int().nonnegative().optional(),
});

export const EscapePhaseActionSchema = z.object({
  project_ref: z.string(),
  run_id: z.string(),
  action: z.literal('escape_phase'),
  phase: z.literal('split'),
  escape_code: EscapeCodeSchema,
});

export const SkipPhasesActionSchema = z.object({
  project_ref: z.string(),
  run_id: z.string(),
  action: z.literal('skip_phases'),
  phases: z.array(PhaseNameSchema),
});

export const RunTransitionSchema = z.discriminatedUnion('action', [
  StartPhaseActionSchema,
  CompletePhaseActionSchema,
  EscapePhaseActionSchema,
  SkipPhasesActionSchema,
]);
export type RunTransition = z.infer<typeof RunTransitionSchema>;

// --- Factory: initial state ---

export function createInitialRunState(params: {
  run_id: string;
  project_ref: string;
  source_file: string;
}): RunState {
  const now = new Date().toISOString();
  return {
    run_id: params.run_id,
    project_ref: params.project_ref,
    epic_ref: null,
    source_file: params.source_file,
    created_at: now,
    updated_at: now,
    current_phase: 'validate',
    phases: {
      validate: {
        status: 'pending',
        started_at: null,
        completed_at: null,
        output: 'validation-report.md',
        result: null,
        blocking_issues: 0,
        warning_issues: 0,
      },
      split: {
        status: 'pending',
        started_at: null,
        completed_at: null,
        output: 'stories-manifest.json',
        stories_created: 0,
        pending_review: true,
        escape_code: null,
      },
      devplan: {
        status: 'pending',
        started_at: null,
        completed_at: null,
        output: 'devplan-manifest.json',
        pending_review: true,
      },
    },
  };
}
