/**
 * @file types/manifest.ts
 * @description Zod schemas for imbas manifests (stories + devplan)
 * @see `agents/planner.md` (stories-manifest), `agents/engineer.md` (devplan-manifest)
 */

import { z } from 'zod';

// --- Common ---

export const ManifestItemStatusSchema = z.enum(['pending', 'created', 'failed', 'skipped']);
export type ManifestItemStatus = z.infer<typeof ManifestItemStatusSchema>;

export const LinkStatusSchema = z.enum(['pending', 'created', 'failed']);
export type LinkStatus = z.infer<typeof LinkStatusSchema>;

// --- Stories Manifest ---

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

// --- Devplan Manifest ---

export const SubtaskItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: ManifestItemStatusSchema.default('pending'),
  issue_ref: z.string().nullable().default(null),
  labels: z.array(z.string()).default([]),
});
export type SubtaskItem = z.infer<typeof SubtaskItemSchema>;

export const TaskItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.literal('Task'),
  status: ManifestItemStatusSchema.default('pending'),
  issue_ref: z.string().nullable().default(null),
  blocks: z.array(z.string()),
  subtasks: z.array(SubtaskItemSchema).default([]),
  labels: z.array(z.string()).default([]),
});
export type TaskItem = z.infer<typeof TaskItemSchema>;

export const StorySubtasksSchema = z.object({
  story_id: z.string(),
  story_ref: z.string().nullable(),
  subtasks: z.array(SubtaskItemSchema).default([]),
});
export type StorySubtasks = z.infer<typeof StorySubtasksSchema>;

export const FeedbackCommentSchema = z.object({
  target_story: z.string(),
  target_ref: z.string().nullable(),
  comment: z.string(),
  type: z.enum(['mapping_divergence', 'story_split_issue']),
  status: ManifestItemStatusSchema.default('pending'),
});
export type FeedbackComment = z.infer<typeof FeedbackCommentSchema>;

export const ExecutionStepSchema = z.object({
  step: z.number().int().positive(),
  action: z.enum([
    'create_tasks',
    'create_task_subtasks',
    'create_links',
    'create_story_subtasks',
    'add_feedback_comments',
  ]),
  items: z.array(z.string()),
});
export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;

export const DevplanManifestSchema = z.object({
  batch: z.string(),
  run_id: z.string(),
  project_ref: z.string(),
  epic_ref: z.string().nullable(),
  created_at: z.string(),
  tasks: z.array(TaskItemSchema).default([]),
  story_subtasks: z.array(StorySubtasksSchema).default([]),
  feedback_comments: z.array(FeedbackCommentSchema).default([]),
  execution_order: z.array(ExecutionStepSchema).default([]),
});
export type DevplanManifest = z.infer<typeof DevplanManifestSchema>;

// --- Implement Plan Manifest ---

export const BatchItemKindSchema = z.enum(['Story', 'Task']);
export type BatchItemKind = z.infer<typeof BatchItemKindSchema>;

export const BatchItemRefSchema = z.object({
  id: z.string(),
  kind: BatchItemKindSchema,
  issue_ref: z.string().nullable(),
  rationale: z.string(),
});
export type BatchItemRef = z.infer<typeof BatchItemRefSchema>;

export const BatchGroupSchema = z.object({
  group_id: z.string(),
  level: z.number().int().nonnegative(),
  can_parallel: z.boolean(),
  items: z.array(BatchItemRefSchema).min(1),
  depends_on_groups: z.array(z.string()).default([]),
});
export type BatchGroup = z.infer<typeof BatchGroupSchema>;

export const BatchEdgeSourceSchema = z.enum([
  'story_link',
  'task_blocks',
  'code_overlap',
  'manual',
]);
export type BatchEdgeSource = z.infer<typeof BatchEdgeSourceSchema>;

export const BatchEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  source: BatchEdgeSourceSchema,
  weight: z.number().default(1),
});
export type BatchEdge = z.infer<typeof BatchEdgeSchema>;

export const BatchCycleBrokenSchema = z.object({
  nodes: z.array(z.string()),
  resolution: z.string(),
});
export type BatchCycleBroken = z.infer<typeof BatchCycleBrokenSchema>;

export const ImplementPlanSourceSchema = z.enum(['stories', 'devplan']);
export type ImplementPlanSource = z.infer<typeof ImplementPlanSourceSchema>;

export const ImplementPlanManifestSchema = z.object({
  batch: z.string(),
  run_id: z.string(),
  project_ref: z.string(),
  created_at: z.string(),
  source_manifest: ImplementPlanSourceSchema,
  groups: z.array(BatchGroupSchema).default([]),
  edges: z.array(BatchEdgeSchema).default([]),
  cycles_broken: z.array(BatchCycleBrokenSchema).default([]),
  unresolved: z.array(z.string()).default([]),
  degraded: z.boolean().default(false),
});
export type ImplementPlanManifest = z.infer<typeof ImplementPlanManifestSchema>;

// --- Manifest Summary ---

export interface ManifestSummary {
  total: number;
  pending: number;
  created: number;
  failed: number;
}

export interface ImplementPlanSummary {
  total_groups: number;
  total_items: number;
  max_level: number;
  unresolved: number;
  cycles_broken: number;
  degraded: boolean;
}
