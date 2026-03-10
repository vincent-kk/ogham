#!/usr/bin/env node
import type { PreToolUseInput } from '../../types/hooks.js';
import { readStdin } from '../../lib/stdin.js';
import { handlePreToolUse } from '../pre-tool-use.js';

const raw = await readStdin(2000);
let result;
try {
  const input = JSON.parse(raw) as PreToolUseInput;
  result = await handlePreToolUse(input);
} catch {
  result = { continue: true };
}
process.stdout.write(JSON.stringify(result));
