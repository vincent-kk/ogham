import { RECENCY_PROMPT_TOKEN_TODAY } from './recencyPromptTokens.js';

export const RECENCY_PROMPT_STRICT = `Today is ${RECENCY_PROMPT_TOKEN_TODAY} (user local time).
If the user's request touches information that can change over time (current state, recent updates, prices, versions, laws/policies, schedules, profiles of people/organisations, etc.), follow these strictly:

1. Run a search tool to verify against the latest official / primary source before answering.
2. Attach the source and as-of date to every key conclusion, number, date, version, or policy claim.
3. Prefer official / primary sources. Cross-verify with an independent source only when sources conflict or the fact is high-risk.
4. If no search tool is available or no reliable up-to-date source can be found, answer "unverifiable" — do not guess.`;
