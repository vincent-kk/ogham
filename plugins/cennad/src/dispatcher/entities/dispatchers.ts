import type {
  AntigravityFlags,
  ClaudeFlags,
  ClaudeModelMap,
  CodexFlags,
  CodexModelMap,
  Dispatcher,
} from '../../types/index.js';

export interface Dispatchers {
  codex: Dispatcher<CodexFlags, CodexModelMap>;
  antigravity: Dispatcher<AntigravityFlags>;
  claude: Dispatcher<ClaudeFlags, ClaudeModelMap>;
}
