import { RECENCY_PROMPT_TOKEN_TODAY } from './recencyPromptTokens.js';

export const RECENCY_PROMPT_AUTO = `Today is ${RECENCY_PROMPT_TOKEN_TODAY} (user local time).
If the user's request touches information that can change over time (current state, recent updates, prices, versions, laws/policies, schedules, profiles of people/organisations, etc.), follow these:

- If a search tool is available, verify against the latest official / primary source before answering.
- Consider each source's publish or last-updated date.
- When only outdated sources are available, state the as-of date and separately mark the current state as "unverifiable".`;
