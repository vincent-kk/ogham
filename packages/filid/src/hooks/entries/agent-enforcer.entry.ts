#!/usr/bin/env node
import type { SubagentStartInput } from '../../types/hooks.js';
import { readStdin } from '../../lib/stdin.js';
import { enforceAgentRole } from '../agent-enforcer.js';

const raw = await readStdin(2000);
let result;
try {
  const input = JSON.parse(raw) as SubagentStartInput;
  result = enforceAgentRole(input);
} catch {
  result = { continue: true };
}
process.stdout.write(JSON.stringify(result));
