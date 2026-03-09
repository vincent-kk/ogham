#!/usr/bin/env node
import type { UserPromptSubmitInput } from '../../types/hooks.js';
import { handleUserPromptSubmit } from '../user-prompt-submit.js';

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk as Buffer);
}
const raw = Buffer.concat(chunks).toString('utf-8');
let result;
try {
  const input = JSON.parse(raw) as UserPromptSubmitInput;
  result = handleUserPromptSubmit(input);
} catch {
  result = { continue: true };
}

process.stdout.write(JSON.stringify(result));
