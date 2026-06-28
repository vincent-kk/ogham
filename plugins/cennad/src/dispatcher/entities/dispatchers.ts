import type {
  AntigravityFlags,
  CodexFlags,
  Dispatcher,
} from '../../types/index.js';

export interface Dispatchers {
  codex: Dispatcher<CodexFlags>;
  antigravity: Dispatcher<AntigravityFlags>;
}
