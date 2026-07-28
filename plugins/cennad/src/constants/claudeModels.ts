import type { ClaudeEffort } from '../types/dispatch.js';

// Curated claude-code model aliases. claude-code has no dynamic model-list
// subcommand, so the settings UI offers this fixed set.
export const CLAUDE_MODEL_ALIASES = [
  'opus',
  'sonnet',
  'haiku',
  'fable',
  'mythos',
  'best',
  'opus[1m]',
  'sonnet[1m]',
] as const;

// Ordered effort scale, low → highest. `ultracode` is the top of it and the one
// level that is a mode rather than a depth: it turns on multi-agent orchestration,
// which is why it ranks above `max`.
export const CLAUDE_EFFORT_LEVELS: readonly ClaudeEffort[] = [
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
  'ultracode',
];

// Per-model effort caps, keyed by the aliases in CLAUDE_MODEL_ALIASES and tracking
// the model each one resolves to (measured 2026-07-28 via `modelUsage.
// canonicalModel`): opus/opus[1m] → claude-opus-5, sonnet/sonnet[1m] →
// claude-sonnet-5, fable/best → claude-fable-5, haiku → claude-haiku-4-5. The
// Claude 5 family carries the whole ladder, so sonnet is no longer the xhigh
// exception it was in the 4.6 generation.
//
// The settings UI is the only guard: claude-code accepts any level for any model
// and silently skips one the model cannot honour — including `--effort ultracode`
// on haiku — so an unsupported pairing fails as a quiet downgrade rather than an
// error. haiku has no effort axis at all (the API rejects effort on it), hence the
// empty set → the effort selector is disabled.
export const MODEL_EFFORT_SETS: Record<string, readonly ClaudeEffort[]> = {
  opus: ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'],
  'opus[1m]': ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'],
  fable: ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'],
  mythos: ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'],
  best: ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'],
  sonnet: ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'],
  'sonnet[1m]': ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'],
  haiku: [],
};
