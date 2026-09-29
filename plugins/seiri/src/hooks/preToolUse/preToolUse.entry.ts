#!/usr/bin/env node
// Loaded by hooks/hooks.json; bridge/claude/pre-tool-use.mjs selects this entry.
import { logHookFailure } from '@ogham/cross-platform';

import { EMPTY_RESULT, PLUGIN_NAME } from '../../constants/plugin.js';
import type { HookOutput, PreToolUseInput } from '../../types/hooks.js';
import { readStdin } from '../shared/readStdin.js';
import { writeHookOutput } from '../shared/writeHookOutput.js';

import { processToolStart } from './preToolUse.js';
import { expandEditInputs } from './utils/expandEditInputs.js';

let result: HookOutput = EMPTY_RESULT;
try {
  const input = JSON.parse(await readStdin()) as PreToolUseInput;
  // One physical Codex patch may carry several logical edits; their notices
  // leave as one merged response.
  const contexts: string[] = [];
  for (const logical of expandEditInputs(input)) {
    const context =
      processToolStart(logical).hookSpecificOutput?.additionalContext;
    if (context && !contexts.includes(context)) contexts.push(context);
  }
  if (contexts.length > 0)
    result = {
      continue: true,
      hookSpecificOutput: {
        hookEventName: input.hook_event_name,
        additionalContext: contexts.join('\n'),
      },
    };
} catch (error) {
  logHookFailure(PLUGIN_NAME, 'pre-tool-use', error);
}
writeHookOutput(result);
