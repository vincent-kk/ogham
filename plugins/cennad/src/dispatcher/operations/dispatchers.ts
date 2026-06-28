import { antigravityDispatcher } from '../antigravity/index.js';
import { claudeDispatcher } from '../claude/index.js';
import { codexDispatcher } from '../codex/index.js';
import type { Dispatchers } from '../entities/dispatchers.js';

export const dispatchers: Dispatchers = {
  codex: codexDispatcher,
  antigravity: antigravityDispatcher,
  claude: claudeDispatcher,
};
