#!/usr/bin/env node
import type { PostToolUseInput } from './cache-updater.js';
import { runCacheUpdater } from './cache-updater.js';
import { readStdin, writeResult } from '../shared/shared.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as PostToolUseInput;
  result = runCacheUpdater(input);
} catch {
  result = { continue: true };
}
writeResult(result);
