import type { CodexFlags, Dispatcher, GeminiFlags } from '../../types/index.js';

export interface Dispatchers {
  codex: Dispatcher<CodexFlags>;
  gemini: Dispatcher<GeminiFlags>;
}
