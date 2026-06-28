import { z } from 'zod';

import type {
  ConversationError,
  ConversationOptions,
  Tier,
} from './conversation.js';

export const CodexSandboxModeSchema = z.enum([
  'read-only',
  'workspace-write',
  'danger-full-access',
  'off',
]);
export type CodexSandboxMode = z.infer<typeof CodexSandboxModeSchema>;

export const CodexFlagsSchema = z.object({
  yolo: z.boolean(),
  sandbox: CodexSandboxModeSchema,
});
export type CodexFlags = z.infer<typeof CodexFlagsSchema>;

export const AntigravityFlagsSchema = z.object({
  // Forced off while agy #76 (non-TTY output drop) is unfixed — the --sandbox
  // wiring is commented out in buildStartArgs/buildResumeArgs to restore later.
  // Kept in the schema for config back-compat.
  sandbox: z.boolean(),
  skip_permissions: z.boolean(),
});
export type AntigravityFlags = z.infer<typeof AntigravityFlagsSchema>;

// claude-code permission modes. `bypassPermissions` maps to
// --dangerously-skip-permissions; there is no sandbox flag, so isolation is
// permission-based only.
export const ClaudePermissionModeSchema = z.enum([
  'default',
  'acceptEdits',
  'auto',
  'dontAsk',
  'plan',
  'bypassPermissions',
]);
export type ClaudePermissionMode = z.infer<typeof ClaudePermissionModeSchema>;

export const ClaudeFlagsSchema = z.object({
  permission_mode: ClaudePermissionModeSchema,
  fallback_model: z.string().optional(),
});
export type ClaudeFlags = z.infer<typeof ClaudeFlagsSchema>;

// claude-code reasoning effort scale (excludes ultracode, which is a separate
// swarm setting, not an --effort value).
export const ClaudeEffortSchema = z.enum([
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
]);
export type ClaudeEffort = z.infer<typeof ClaudeEffortSchema>;

// Per-tier {model, effort}. effort is optional — omitted (or unset for a model
// that has no effort support, e.g. haiku) means no --effort flag is sent.
export const ClaudeTierConfigSchema = z.object({
  model: z.string(),
  effort: ClaudeEffortSchema.optional(),
});
export type ClaudeTierConfig = z.infer<typeof ClaudeTierConfigSchema>;

export const ClaudeModelMapSchema = z.object({
  high: ClaudeTierConfigSchema,
  mid: ClaudeTierConfigSchema,
  low: ClaudeTierConfigSchema,
});
export type ClaudeModelMap = z.infer<typeof ClaudeModelMapSchema>;

// Per-tier model-name map. Lives here (not config.ts) so DispatchOptions can
// carry it without a config→dispatch→config import cycle.
export const TierModelMapSchema = z.object({
  high: z.string(),
  mid: z.string(),
  low: z.string(),
});
export type TierModelMap = z.infer<typeof TierModelMapSchema>;

export interface DispatchOptions<F = unknown, M = TierModelMap> {
  prompt: string;
  tier: Tier;
  options: ConversationOptions;
  sessionId: string;
  cwd: string;
  flags: F;
  spawnTimeoutMs: number;
  // Tier→model map, injected by the MCP tool for providers that resolve concrete
  // models from config (antigravity's TierModelMap, claude's ClaudeModelMap).
  // codex ignores it.
  modelMap?: M;
}

export interface DispatchResumeOptions<
  F = unknown,
  M = TierModelMap,
> extends DispatchOptions<F, M> {
  externalSessionRef: string;
}

export interface DispatchResult {
  status: 'success' | 'failure';
  response: string | null;
  error: ConversationError | null;
  externalSessionRef: string;
  ignoredOptions: string[];
  resolvedModel: string | null;
}

export interface Dispatcher<F = unknown, M = TierModelMap> {
  readonly supportedOptions: ReadonlySet<keyof ConversationOptions>;
  start(args: DispatchOptions<F, M>): Promise<DispatchResult>;
  resume(args: DispatchResumeOptions<F, M>): Promise<DispatchResult>;
}
