import {
  RECENCY_PROMPT_NORMAL,
  RECENCY_PROMPT_STRICT,
} from '../../constants/index.js';
import type { RecencyLevel } from '../../types/index.js';

export interface ComposePromptInput {
  prompt: string;
  preamble: string;
  recencyLevel: RecencyLevel;
  today?: string;
}

function todayLocal(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function resolveRecencyBody(level: RecencyLevel, today: string): string | null {
  if (level === 'normal')
    return RECENCY_PROMPT_NORMAL.replaceAll('{today}', today);
  if (level === 'strict')
    return RECENCY_PROMPT_STRICT.replaceAll('{today}', today);
  return null;
}

export function composePrompt(input: ComposePromptInput): string {
  const today = input.today ?? todayLocal();
  const recencyBody = resolveRecencyBody(input.recencyLevel, today);
  const preamble = input.preamble.trim().length > 0 ? input.preamble : null;

  if (recencyBody === null && preamble === null) return input.prompt;

  const parts: string[] = [];
  if (recencyBody !== null) {
    parts.push(`<recency_policy>\n${recencyBody}\n</recency_policy>`);
  }
  if (preamble !== null) parts.push(preamble);
  parts.push(input.prompt);
  return parts.join('\n\n');
}
