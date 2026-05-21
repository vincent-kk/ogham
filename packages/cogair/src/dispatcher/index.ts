import type { Dispatcher, Provider } from '../types/index.js';

import { codexDispatcher } from './codex/index.js';
import { geminiDispatcher } from './gemini/index.js';

export { codexDispatcher } from './codex/index.js';
export { geminiDispatcher } from './gemini/index.js';
export { buildResponse, type BuildResponseArgs } from './envelope.js';
export { mapError, type MapErrorInput } from './errorMap.js';

export const dispatchers: Record<Provider, Dispatcher> = {
  codex: codexDispatcher,
  gemini: geminiDispatcher,
};
