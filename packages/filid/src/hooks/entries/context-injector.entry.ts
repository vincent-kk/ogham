#!/usr/bin/env node
import { readStdin } from '../../lib/stdin.js';
import type { UserPromptSubmitInput } from '../../types/hooks.js';
import { handleUserPromptSubmit } from '../user-prompt-submit.js';

const raw = await readStdin(3000);
let result;
try {
  const input = JSON.parse(raw) as UserPromptSubmitInput;
  result = handleUserPromptSubmit(input);
} catch {
  result = { continue: true };
}

process.stdout.write(JSON.stringify(result));
