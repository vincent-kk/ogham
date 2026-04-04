/**
 * @file types/cache.ts
 * @description Zod schemas for Jira metadata cache
 * @see skills/cache/references/cache-structure.md
 */

import { z } from 'zod';

// --- project-meta.json ---

export const ProjectMetaSchema = z.object({
  key: z.string(),
  name: z.string(),
  url: z.string(),
  lead: z.string().nullable().default(null),
  project_type: z.string().default('software'),
});
export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;

// --- issue-types.json ---

export const IssueTypeFieldSchema = z.object({
  required: z.boolean(),
  name: z.string().optional(),
});

export const IssueTypeEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  subtask: z.boolean(),
  fields: z.record(z.string(), IssueTypeFieldSchema).default({}),
});

export const IssueTypeCacheSchema = z.object({
  types: z.array(IssueTypeEntrySchema),
});
export type IssueTypeCache = z.infer<typeof IssueTypeCacheSchema>;

// --- link-types.json ---

export const LinkTypeEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  inward: z.string(),
  outward: z.string(),
});

export const LinkTypeCacheSchema = z.object({
  types: z.array(LinkTypeEntrySchema),
});
export type LinkTypeCache = z.infer<typeof LinkTypeCacheSchema>;

// --- workflows.json ---
// TODO: requires Atlassian API for project-level workflow collection;
// not available in current MCP surface. Schema stub for future use.

export const WorkflowCacheSchema = z.object({
  states: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string().optional(),
  })).default([]),
});
export type WorkflowCache = z.infer<typeof WorkflowCacheSchema>;

// --- cached_at.json ---

export const CachedAtSchema = z.object({
  cached_at: z.string(),
  ttl_hours: z.number().positive().default(24),
});
export type CachedAt = z.infer<typeof CachedAtSchema>;

// --- Cache type enum ---

export const CacheTypeSchema = z.enum([
  'project-meta',
  'issue-types',
  'link-types',
  'workflows',
  'all',
]);
export type CacheType = z.infer<typeof CacheTypeSchema>;
