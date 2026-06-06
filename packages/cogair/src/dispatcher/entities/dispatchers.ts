import type {
  AntigravityFlags,
  CodexFlags,
  Dispatcher,
  GeminiFlags,
} from '../../types/index.js';

export interface Dispatchers {
  codex: Dispatcher<CodexFlags>;
  gemini: Dispatcher<GeminiFlags>;
  antigravity: Dispatcher<AntigravityFlags>;
}
