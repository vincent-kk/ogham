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
 * - `github` : GitHub via `gh` CLI (prototype — 2-line read path only)
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

export const JiraConfigSchema = z.object({
  issue_types: JiraIssueTypesSchema.default({}),
  workflow_states: JiraWorkflowStatesSchema.default({}),
  link_types: JiraLinkTypesSchema.default({}),
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

export const MediaConfigSchema = z.object({
  scene_sieve_command: z.string().default('npx -y @lumy-pack/scene-sieve'),
  temp_dir: z.string().default('.imbas/.temp'),
  max_frames: z.number().int().positive().default(20),
  default_preset: z.string().default('medium-video'),
});
export type MediaConfig = z.infer<typeof MediaConfigSchema>;

export const ImbasConfigSchema = z.object({
  version: z.string().default('1.0'),
  provider: ProviderSchema.default('jira'),
  language: LanguageConfigSchema.default({}),
  defaults: DefaultsConfigSchema.default({}),
  jira: JiraConfigSchema.default({}),
  github: GithubConfigSchema.optional(),
  media: MediaConfigSchema.default({}),
});
export type ImbasConfig = z.infer<typeof ImbasConfigSchema>;
