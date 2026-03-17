#!/usr/bin/env node
import { createLogger } from '../../lib/logger.js';
import { readStdin } from '../../lib/stdin.js';
import type { SubagentStartInput } from '../../types/hooks.js';
import { enforceAgentRole } from '../agent-enforcer.js';

const log = createLogger('agent-enforcer');
const raw = await readStdin(2000);
let result;
try {
  const input = JSON.parse(raw) as SubagentStartInput;
  result = enforceAgentRole(input);
} catch (e) {
  log.error('hook entry failed', e);
  result = { continue: true };
}
process.stdout.write(JSON.stringify(result));
