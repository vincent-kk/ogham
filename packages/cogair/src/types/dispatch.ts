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

export interface DispatchOptions<F = unknown> {
  prompt: string;
  model: 'high' | 'mid' | 'low' | 'auto';
  options: ConversationOptions;
  sessionId: string;
  cwd: string;
  flags: F;
  spawnTimeoutMs: number;
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
