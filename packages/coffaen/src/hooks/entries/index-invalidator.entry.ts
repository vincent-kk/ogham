#!/usr/bin/env node
import type { PostToolUseInput } from '../index-invalidator.js';
import { runIndexInvalidator } from '../index-invalidator.js';
import { readStdin, writeResult } from '../shared.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as PostToolUseInput;
  result = runIndexInvalidator(input);
} catch {
  result = { continue: true };
}

writeResult(result);
