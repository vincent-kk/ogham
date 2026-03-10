#!/usr/bin/env node
import { readStdin } from '../../lib/stdin.js';
import type { PostToolUseInput } from '../../types/hooks.js';
import { trackChange } from '../change-tracker.js';

// Intentionally disabled hook — see change-tracker.ts @deprecated for rationale.
// Minimal ChangeQueue stub for the standalone entry — no persistent queue available yet.
const stubQueue = {
  enqueue: (_record: unknown) => {},
};

const raw = await readStdin(2000);
let result;
try {
  const input = JSON.parse(raw) as PostToolUseInput;
  result = trackChange(input, stubQueue as any);
} catch {
  result = { continue: true };
}

process.stdout.write(JSON.stringify(result));
