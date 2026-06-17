import { z } from 'zod';

export const PROVIDERS = ['antigravity', 'gemini', 'codex'] as const;
export const MODEL_ALIASES = ['high', 'mid', 'low', 'auto'] as const;
export const ErrorCode = {
  BudgetExhausted: 'budget_exhausted',
  RateLimit: 'rate_limit',
  Auth: 'auth',
  Disabled: 'disabled',
  Network: 'network',
  CliError: 'cli_error',
  Unknown: 'unknown',
} as const;

export type Provider = (typeof PROVIDERS)[number];
export type ModelAlias = (typeof MODEL_ALIASES)[number];
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ProviderSchema = z.enum(PROVIDERS);
export const ModelAliasSchema = z.enum(MODEL_ALIASES);
export const ErrorCodeSchema = z.enum(
  Object.values(ErrorCode) as [ErrorCode, ...ErrorCode[]],
);

export const ConversationOptionsSchema = z.object({}).passthrough();

export type ConversationOptions = z.infer<typeof ConversationOptionsSchema>;

export const ConversationErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
});

export type ConversationError = z.infer<typeof ConversationErrorSchema>;

export const ConversationMetaSchema = z.object({
  turn: z.number().int().nonnegative(),
  created_at: z.string(),
  elapsed_ms: z.number().int().nonnegative(),
  ignored_options: z.array(z.string()),
});

export type ConversationMeta = z.infer<typeof ConversationMetaSchema>;

export const ConversationResponseSchema = z.object({
  status: z.enum(['success', 'failure']),
  session_id: z.string().uuid(),
  provider: ProviderSchema.nullable(),
  response: z.string().nullable(),
  error: ConversationErrorSchema.nullable(),
  meta: ConversationMetaSchema,
  artifact_path: z.string().optional(),
});

export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;
