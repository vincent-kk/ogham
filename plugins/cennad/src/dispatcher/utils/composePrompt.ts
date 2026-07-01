import {
  RECENCY_PROMPT_AUTO,
  RECENCY_PROMPT_STRICT,
  RECENCY_PROMPT_TOKEN_TODAY,
} from '../../constants/index.js';
import type { RecencyLevel } from '../../types/index.js';

export interface ComposePromptInput {
  prompt: string;
  preamble: string;
  recencyLevel: RecencyLevel;
  today?: string;
}

function todayLocal(): string {
  return new Intl.DateTimeFormat('sv-SE').format(new Date());
}

function resolveRecencyBody(level: RecencyLevel, today: string): string | null {
  if (level === 'auto')
    return RECENCY_PROMPT_AUTO.replaceAll(RECENCY_PROMPT_TOKEN_TODAY, today);
  if (level === 'strict')
    return RECENCY_PROMPT_STRICT.replaceAll(RECENCY_PROMPT_TOKEN_TODAY, today);
  return null;
}

export function composePrompt(input: ComposePromptInput): string {
  const today = input.today ?? todayLocal();
  const recencyBody = resolveRecencyBody(input.recencyLevel, today);
  const preamble = input.preamble.trim().length > 0 ? input.preamble : null;

  if (recencyBody === null && preamble === null) return input.prompt;

  const parts: string[] = [];
  if (recencyBody !== null)
    parts.push(`<recency_policy>\n${recencyBody}\n</recency_policy>`);

  if (preamble !== null) parts.push(preamble);
  parts.push(input.prompt);
  return parts.join('\n\n');
}
