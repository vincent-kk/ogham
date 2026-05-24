import { RECENCY_PROMPT_TOKEN_TODAY } from './recencyPromptTokens.js';

export const RECENCY_PROMPT_AUTO = `Today: ${RECENCY_PROMPT_TOKEN_TODAY}.

If the user's answer materially depends on current or recently changed information (e.g. current status, prices, software/API versions, laws, policies, schedules, current roles), prefer a web search against an official or primary source and note each source's publish/updated date.

Skip search for stable facts, purely local-code work, or information the user already supplied — unless recency would change the answer. When only outdated sources exist, state their date and mark only the current-state portion as "unverifiable".`;
