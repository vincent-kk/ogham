import { antigravityDispatcher } from '../antigravity/index.js';
import { codexDispatcher } from '../codex/index.js';
import type { Dispatchers } from '../entities/dispatchers.js';
import { geminiDispatcher } from '../gemini/index.js';

export const dispatchers: Dispatchers = {
  codex: codexDispatcher,
  gemini: geminiDispatcher,
  antigravity: antigravityDispatcher,
};
