import type {
  AntigravityFlags,
  ClaudeFlags,
  ClaudeModelMap,
  CodexFlags,
  Dispatcher,
} from '../../types/index.js';

export interface Dispatchers {
  codex: Dispatcher<CodexFlags>;
  antigravity: Dispatcher<AntigravityFlags>;
  claude: Dispatcher<ClaudeFlags, ClaudeModelMap>;
}
