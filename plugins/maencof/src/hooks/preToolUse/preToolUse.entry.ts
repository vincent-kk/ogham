#!/usr/bin/env node
import { logHookFailure, normalizeCodexToolUses } from '@ogham/cross-platform';

import type { DispatchInput, MergedHookOutput } from '../../types/dispatch.js';
import { readStdin } from '../shared/readStdin.js';
import { writeResult } from '../shared/writeResult.js';

import { toPreToolUseEnvelope } from './helpers/denyEnvelope/denyEnvelope.js';
import { orchestratePreToolUseBatch } from './preToolUse.js';

const raw = await readStdin();
let result: MergedHookOutput;
try {
  // Codex sends file edits as apply_patch; normalize every logical operation
  // so guards see the same Write/Edit/Delete vocabulary as Claude and agy.
  const normalized = normalizeCodexToolUses(JSON.parse(raw) as DispatchInput);
  result = orchestratePreToolUseBatch(normalized);
} catch (e) {
  logHookFailure('maencof', 'pre-tool-use', e);
  result = { continue: true };
}

// Concern-level blocks become permissionDecision:"deny" — never continue:false.
writeResult(toPreToolUseEnvelope(result));
