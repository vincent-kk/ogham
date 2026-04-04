/**
 * @file types/manifest.ts
 * @description Zod schemas for imbas manifests (stories + devplan)
 * @see agents/imbas-planner.md (stories-manifest), agents/imbas-engineer.md (devplan-manifest)
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
  type: z.literal('Story'),
  status: ManifestItemStatusSchema.default('pending'),
  issue_ref: z.string().nullable().default(null),
  verification: StoryVerificationSchema,
  size_check: z.enum(['PASS', 'FAIL', 'REVIEW']),
  split_from: z.string().nullable().default(null),
  split_into: z.array(z.string()).default([]),
});
export type StoryItem = z.infer<typeof StoryItemSchema>;

export const StoryLinkSchema = z.object({
  type: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  status: LinkStatusSchema.default('pending'),
});
export type StoryLink = z.infer<typeof StoryLinkSchema>;

export const StoriesManifestSchema = z.object({
  batch: z.string(),
  run_id: z.string(),
  project_ref: z.string(),
  epic_ref: z.string().nullable(),
  created_at: z.string(),
  stories: z.array(StoryItemSchema),
  links: z.array(StoryLinkSchema).default([]),
});
export type StoriesManifest = z.infer<typeof StoriesManifestSchema>;

// --- Devplan Manifest ---

export const SubtaskItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: ManifestItemStatusSchema.default('pending'),
  issue_ref: z.string().nullable().default(null),
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

// --- Manifest Summary ---

export interface ManifestSummary {
  total: number;
  pending: number;
  created: number;
  failed: number;
}
