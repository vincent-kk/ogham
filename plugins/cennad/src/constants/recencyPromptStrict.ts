import { RECENCY_PROMPT_TOKEN_TODAY } from './recencyPromptTokens.js';

export const RECENCY_PROMPT_STRICT = `Today: ${RECENCY_PROMPT_TOKEN_TODAY}.

When the answer depends on facts that may have changed since your training (current status, recent changes, prices, software/API versions, laws or policies, schedules, current roles of people or organizations), follow these strictly:

1. Do not answer from memory. Use a web search tool first and prefer official or authoritative primary sources.
2. For each material time-sensitive claim, cite the source and its publish/updated date.
3. If web search is unavailable or yields no reliable recent source, label only that specific claim "unverifiable" — answer stable or source-provided parts normally.`;
