#!/usr/bin/env node
import type { UserPromptSubmitInput } from './context-injector.js';
import { injectContext } from './context-injector.js';
import { readStdin, writeResult } from '../shared/index.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as UserPromptSubmitInput;
  result = injectContext(input);
} catch {
  result = { continue: true };
}
writeResult(result);
