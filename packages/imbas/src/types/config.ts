/**
 * @file types/config.ts
 * @description Zod schemas for imbas config.json
 * @see skills/imbas-setup/references/init-workflow.md
 */

import { z } from 'zod';

/**
 * Issue-tracking provider. Selects where Story/Task/Subtask entities are stored
 * and how skill workflows route their tracker operations.
 *
 * - `jira`   : Atlassian Cloud via the `atlassian` MCP server (shipping)
 * - `github` : GitHub via `gh` CLI (shipping)
 * - `local`  : Markdown files under `.imbas/<KEY>/issues/` (shipping from v1.1)
 *
 * Default is `jira` for backward compatibility with existing configs.
 */
export const ProviderSchema = z.enum(['jira', 'github', 'local']);
export type Provider = z.infer<typeof ProviderSchema>;

export const LanguageConfigSchema = z.object({
  documents: z.string().default('ko'),
  skills: z.string().default('en'),
  issue_content: z.string().default('ko'),
  reports: z.string().default('ko'),
});
export type LanguageConfig = z.infer<typeof LanguageConfigSchema>;

export const LlmModelConfigSchema = z.object({
  validate: z.string().default('sonnet'),
  split: z.string().default('sonnet'),
  devplan: z.string().default('opus'),
});
export type LlmModelConfig = z.infer<typeof LlmModelConfigSchema>;

export const SubtaskLimitsSchema = z.object({
  max_lines: z.number().int().positive().default(200),
  max_files: z.number().int().positive().default(10),
  review_hours: z.number().positive().default(1),
});
export type SubtaskLimits = z.infer<typeof SubtaskLimitsSchema>;

export const DefaultsConfigSchema = z.object({
  project_ref: z.string().nullable().default(null),
  llm_model: LlmModelConfigSchema.default({}),
  subtask_limits: SubtaskLimitsSchema.default({}),
});
export type DefaultsConfig = z.infer<typeof DefaultsConfigSchema>;

export const JiraIssueTypesSchema = z.object({
  epic: z.string().default('Epic'),
  story: z.string().default('Story'),
  task: z.string().default('Task'),
  subtask: z.string().default('Sub-task'),
  bug: z.string().default('Bug'),
});

export const JiraWorkflowStatesSchema = z.object({
  todo: z.string().default('To Do'),
  ready_for_dev: z.string().default('Ready for Dev'),
  in_progress: z.string().default('In Progress'),
  in_review: z.string().default('In Review'),
  done: z.string().default('Done'),
});

export const JiraLinkTypesSchema = z.object({
  blocks: z.string().default('Blocks'),
  split_into: z.string().default('is split into'),
  split_from: z.string().default('split from'),
  relates_to: z.string().default('relates to'),
});

export const JiraPhaseToWorkflowSchema = z.object({
  pipeline_exit: z.string().default('ready_for_dev'),
});
export type JiraPhaseToWorkflow = z.infer<typeof JiraPhaseToWorkflowSchema>;

export const JiraConfigSchema = z.object({
  issue_types: JiraIssueTypesSchema.default({}),
  workflow_states: JiraWorkflowStatesSchema.default({}),
  link_types: JiraLinkTypesSchema.default({}),
  phase_to_workflow: JiraPhaseToWorkflowSchema.default({}),
});
export type JiraConfig = z.infer<typeof JiraConfigSchema>;

export const GithubLinkTypeSchema = z.enum([
  'blocks',
  'blocked-by',
  'split-from',
  'split-into',
  'relates',
]);
export type GithubLinkType = z.infer<typeof GithubLinkTypeSchema>;

/**
 * GitHub provider config. Only consulted when `provider === 'github'`.
 * Authentication is delegated to ambient `gh auth` — no token field.
 *
 * - `repo`: `owner/name` target repository for all imbas-managed issues.
 * - `defaultLabels`: extra labels applied to every created issue on top
 *   of the auto-managed `type:*` and `status:*` labels.
 * - `linkTypes`: allowed link type keys for the body `## Links` section.
 */
export const GithubConfigSchema = z.object({
  repo: z.string(),
  defaultLabels: z.array(z.string()).default([]),
  linkTypes: z.array(GithubLinkTypeSchema).default([
    'blocks',
    'blocked-by',
    'split-from',
    'split-into',
    'relates',
  ]),
});
export type GithubConfig = z.infer<typeof GithubConfigSchema>;

export const LabelsConfigSchema = z.object({
  managed: z.string().default('imbas-managed'),
  review_pending: z.string().default('review-pending'),
  review_complete: z.string().default('review-complete'),
  dev_waiting: z.string().default('개발대기'),
  dev_in_progress: z.string().default('개발중'),
  dev_done: z.string().default('개발완료'),
});
export type LabelsConfig = z.infer<typeof LabelsConfigSchema>;

export const ImbasConfigSchema = z.object({
  version: z.string().default('1.0'),
  provider: ProviderSchema.default('jira'),
  language: LanguageConfigSchema.default({}),
  defaults: DefaultsConfigSchema.default({}),
  labels: LabelsConfigSchema.default({}),
  jira: JiraConfigSchema.default({}),
  github: GithubConfigSchema.optional(),
});
export type ImbasConfig = z.infer<typeof ImbasConfigSchema>;
