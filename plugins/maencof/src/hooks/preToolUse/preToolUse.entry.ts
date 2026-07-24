#!/usr/bin/env node
import { normalizeCodexToolUse } from '@ogham/cross-platform/codex-hooks';
import { logHookFailure } from '@ogham/cross-platform/error-log';

import type { DispatchInput, MergedHookOutput } from '../../types/dispatch.js';
import { readStdin } from '../shared/readStdin.js';
import { writeResult } from '../shared/writeResult.js';

import { toPreToolUseEnvelope } from './helpers/denyEnvelope/denyEnvelope.js';
import { orchestratePreToolUse } from './preToolUse.js';

const raw = await readStdin();
let result: MergedHookOutput;
try {
  // Codex sends file edits as apply_patch; normalise to Write/Edit so the
  // layer guard + vault redirector route on tool_name (no-op on Claude/agy).
  const input = normalizeCodexToolUse(JSON.parse(raw) as DispatchInput);
  result = orchestratePreToolUse(input);
} catch (e) {
  logHookFailure('maencof', 'pre-tool-use', e);
  result = { continue: true };
}

// Concern-level blocks become permissionDecision:"deny" — never continue:false.
writeResult(toPreToolUseEnvelope(result));
