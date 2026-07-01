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

// Ordered reasoning-effort scale (excludes ultracode, which is a separate swarm
// setting rather than an --effort value).
export const CLAUDE_EFFORT_LEVELS: readonly ClaudeEffort[] = [
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
];

// Per-model effort caps. claude-code silently downgrades an over-cap request;
// the settings UI uses this to avoid offering unsupported combinations. haiku has
// no effort support (empty set → the effort selector is disabled).
export const MODEL_EFFORT_SETS: Record<string, readonly ClaudeEffort[]> = {
  opus: ['low', 'medium', 'high', 'xhigh', 'max'],
  'opus[1m]': ['low', 'medium', 'high', 'xhigh', 'max'],
  fable: ['low', 'medium', 'high', 'xhigh', 'max'],
  mythos: ['low', 'medium', 'high', 'xhigh', 'max'],
  best: ['low', 'medium', 'high', 'xhigh', 'max'],
  sonnet: ['low', 'medium', 'high', 'max'],
  'sonnet[1m]': ['low', 'medium', 'high', 'max'],
  haiku: [],
};
