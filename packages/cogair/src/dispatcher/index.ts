import type { CodexFlags, Dispatcher, GeminiFlags } from '../types/index.js';

import { codexDispatcher } from './codex/index.js';
import { geminiDispatcher } from './gemini/index.js';

export { codexDispatcher } from './codex/index.js';
export { geminiDispatcher } from './gemini/index.js';
export { buildResponse, type BuildResponseArgs } from './entities/envelope.js';
export { mapError, type MapErrorInput } from './errorMap/index.js';

export interface Dispatchers {
  codex: Dispatcher<CodexFlags>;
  gemini: Dispatcher<GeminiFlags>;
}

export const dispatchers: Dispatchers = {
  codex: codexDispatcher,
  gemini: geminiDispatcher,
};
