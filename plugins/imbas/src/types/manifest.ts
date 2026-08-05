/**
 * @file manifest.ts
 * @description Zod schemas for imbas manifests (stories + estimation)
 * @see .metadata/imbas/storage.md §4 (stories), .metadata/imbas/estimation.md §2.1 (estimation)
 */
import { z } from 'zod';

// --- Common ---

export const ManifestTypeSchema = z.enum(['stories', 'estimation']);
export type ManifestType = z.infer<typeof ManifestTypeSchema>;

export const ManifestItemStatusSchema = z.enum([
  'pending',
  'created',
  'failed',
  'skipped',
]);
export type ManifestItemStatus = z.infer<typeof ManifestItemStatusSchema>;

export const LinkStatusSchema = z.enum(['pending', 'created', 'failed']);
export type LinkStatus = z.infer<typeof LinkStatusSchema>;

// --- Stories Manifest (v2) ---

export const StoryVerificationSchema = z.object({
  anchor_link: z.boolean(),
  coherence: z.enum(['PASS', 'FAIL', 'REVIEW']),
  reverse_inference: z.enum(['PASS', 'FAIL', 'REVIEW']),
});
export type StoryVerification = z.infer<typeof StoryVerificationSchema>;

export const StoryItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.string(),
  status: ManifestItemStatusSchema.default('pending'),
  issue_ref: z.string().nullable().default(null),
  verification: StoryVerificationSchema,
  size_check: z.enum(['PASS', 'FAIL', 'REVIEW']),
  split_from: z.string().nullable().default(null),
  split_into: z.array(z.string()).default([]),
  labels: z.array(z.string()).default([]),
  // estimation.json 연계 시 해당 unit 의 기대 manday — 없으면 null
  estimate_manday: z.number().nonnegative().nullable().default(null),
});
export type StoryItem = z.infer<typeof StoryItemSchema>;

export const StoryLinkSchema = z.object({
  type: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  status: LinkStatusSchema.default('pending'),
});
export type StoryLink = z.infer<typeof StoryLinkSchema>;

export const TransitionItemSchema = z.object({
  issue_ref: z.string(),
  target_status: z.string(),
  reason: z.enum(['horizontal_split', 'source_split']),
  status: ManifestItemStatusSchema.default('pending'),
});
export type TransitionItem = z.infer<typeof TransitionItemSchema>;

export const StoriesManifestSchema = z.object({
  version: z.literal(2).default(2),
  batch: z.string(),
  run_id: z.string(),
  project_ref: z.string(),
  epic_ref: z.string().nullable(),
  created_at: z.string(),
  stories: z.array(StoryItemSchema),
  links: z.array(StoryLinkSchema).default([]),
  transitions: z.array(TransitionItemSchema).default([]),
});
export type StoriesManifest = z.infer<typeof StoriesManifestSchema>;

// --- Estimation Manifest ---

export const ComplexityGradeSchema = z.enum(['S', 'M', 'L', 'XL']);
export type ComplexityGrade = z.infer<typeof ComplexityGradeSchema>;

export const EstimationViewRefsSchema = z.object({
  page: z.array(z.string()).default([]),
  feature: z.array(z.string()).default([]),
  module: z.array(z.string()).default([]),
});
export type EstimationViewRefs = z.infer<typeof EstimationViewRefsSchema>;

export const EstimationPertSchema = z.object({
  o: z.number().nonnegative(),
  m: z.number().nonnegative(),
  p: z.number().nonnegative(),
  expected: z.number().nonnegative(),
  sigma: z.number().nonnegative(),
});
export type EstimationPert = z.infer<typeof EstimationPertSchema>;

export const EstimationUnitSchema = z.object({
  id: z.string(),
  name: z.string(),
  view_refs: EstimationViewRefsSchema,
  single_view: z.boolean().default(false),
  complexity: ComplexityGradeSchema,
  estimate: EstimationPertSchema,
  rationale: z.string(),
  deps: z.array(z.string()).default([]),
});
export type EstimationUnit = z.infer<typeof EstimationUnitSchema>;

export const EstimationRollupSchema = z.object({
  sum_expected: z.number().nonnegative(),
  overhead: z.object({
    integration: z.number().nonnegative(),
    test: z.number().nonnegative(),
    pm: z.number().nonnegative(),
  }),
  buffered_total: z.number().nonnegative(),
  confidence_interval: z.tuple([
    z.number().nonnegative(),
    z.number().nonnegative(),
  ]),
});
export type EstimationRollup = z.infer<typeof EstimationRollupSchema>;

export const EstimationTrackSchema = z.object({
  track: z.number().int().positive(),
  units: z.array(z.string()),
});
export type EstimationTrack = z.infer<typeof EstimationTrackSchema>;

export const EstimationMilestoneSchema = z.object({
  name: z.string(),
  week: z.number().int().nonnegative(),
});
export type EstimationMilestone = z.infer<typeof EstimationMilestoneSchema>;

export const EstimationScheduleSchema = z.object({
  tracks: z.array(EstimationTrackSchema).default([]),
  milestones: z.array(EstimationMilestoneSchema).default([]),
  total_weeks: z.number().int().nonnegative(),
});
export type EstimationSchedule = z.infer<typeof EstimationScheduleSchema>;

export const EstimationRiskSchema = z.object({
  unit: z.string(),
  risk: z.string(),
  impact: z.enum(['low', 'medium', 'high']),
});
export type EstimationRisk = z.infer<typeof EstimationRiskSchema>;

export const EstimationManifestSchema = z.object({
  version: z.literal(1).default(1),
  run_id: z.string(),
  project_ref: z.string(),
  source: z.string(),
  created_at: z.string(),
  config_used: z.record(z.string(), z.unknown()).default({}),
  units: z.array(EstimationUnitSchema),
  rollup: EstimationRollupSchema,
  schedule: EstimationScheduleSchema,
  assumptions: z.array(z.string()).default([]),
  risks: z.array(EstimationRiskSchema).default([]),
});
export type EstimationManifest = z.infer<typeof EstimationManifestSchema>;

// --- Summaries ---

export interface ManifestSummary {
  total: number;
  pending: number;
  created: number;
  failed: number;
}

export interface EstimationSummary {
  units: number;
  sum_expected: number;
  buffered_total: number;
  total_weeks: number;
}
