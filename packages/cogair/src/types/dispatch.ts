import { z } from 'zod';

import type { ConversationError, ConversationOptions } from './conversation.js';

export const GeminiSandboxBackendSchema = z.enum([
  'auto',
  'docker',
  'podman',
  'sandbox-exec',
]);
export type GeminiSandboxBackend = z.infer<typeof GeminiSandboxBackendSchema>;

export const CodexSandboxModeSchema = z.enum([
  'read-only',
  'workspace-write',
  'danger-full-access',
  'off',
]);
export type CodexSandboxMode = z.infer<typeof CodexSandboxModeSchema>;

export const GeminiFlagsSchema = z.object({
  yolo: z.boolean(),
  sandbox: z.boolean(),
  sandbox_backend: GeminiSandboxBackendSchema,
});
export type GeminiFlags = z.infer<typeof GeminiFlagsSchema>;

export const CodexFlagsSchema = z.object({
  yolo: z.boolean(),
  sandbox: CodexSandboxModeSchema,
});
export type CodexFlags = z.infer<typeof CodexFlagsSchema>;

export const AntigravityFlagsSchema = z.object({
  sandbox: z.boolean(),
  skip_permissions: z.boolean(),
});
export type AntigravityFlags = z.infer<typeof AntigravityFlagsSchema>;

// Per-tier model-name map. Lives here (not config.ts) so DispatchOptions can
// carry it without a config→dispatch→config import cycle.
export const TierModelMapSchema = z.object({
  high: z.string(),
  mid: z.string(),
  low: z.string(),
});
export type TierModelMap = z.infer<typeof TierModelMapSchema>;

export interface DispatchOptions<F = unknown> {
  prompt: string;
  model: 'high' | 'mid' | 'low' | 'auto';
  options: ConversationOptions;
  sessionId: string;
  cwd: string;
  flags: F;
  spawnTimeoutMs: number;
  // Tier→model-name map, injected by the MCP tool for providers that resolve
  // concrete model names from config (antigravity). codex/gemini ignore it.
  modelMap?: TierModelMap;
}

export interface DispatchResumeOptions<F = unknown> extends DispatchOptions<F> {
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

export interface Dispatcher<F = unknown> {
  readonly supportedOptions: ReadonlySet<keyof ConversationOptions>;
  start(args: DispatchOptions<F>): Promise<DispatchResult>;
  resume(args: DispatchResumeOptions<F>): Promise<DispatchResult>;
}
