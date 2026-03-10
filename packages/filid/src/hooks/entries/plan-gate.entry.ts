#!/usr/bin/env node
import { readStdin } from '../../lib/stdin.js';
import type { PreToolUseInput } from '../../types/hooks.js';
import { validatePlanExit } from '../plan-gate.js';

const raw = await readStdin(2000);
let result;
try {
  const input = JSON.parse(raw) as PreToolUseInput;
  result = validatePlanExit(input);
} catch {
  result = { continue: true };
}

process.stdout.write(JSON.stringify(result));
