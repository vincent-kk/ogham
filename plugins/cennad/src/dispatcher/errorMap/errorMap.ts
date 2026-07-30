import { ERROR_MESSAGES } from '../../constants/errorCodes.js';
import { type ConversationError, ErrorCode } from '../../types/index.js';

import { type MapErrorInput, classify } from './utils/classify.js';

export function mapError(input: MapErrorInput): ConversationError {
  const code = classify(input);
  // A stop has no reported reason — only the output the run happened to have
  // produced when it was killed. Quoting that would explain the stop with
  // whatever the run was busy with, which is the same text `classify`
  // deliberately skipped to reach this code.
  if (code === ErrorCode.Cancelled)
    return { code, message: ERROR_MESSAGES[code] };
  // The CLI's own account of the failure outranks stderr: a CLI that reports
  // through structured output leaves stderr holding whatever it happened to
  // print, which reads to the caller as the reason and is not one. spawnError comes
  // next for the same reason — it exists only when the run never produced a verdict
  // (a timeout, a missing binary), and stderr then holds the same incidental notice.
  const cliMessage = input.cliMessage?.trim() ?? '';
  const stderr = input.stderr.trim();
  const spawnMessage = input.spawnError?.message.trim() ?? '';
  const reported = cliMessage || spawnMessage || stderr;
  const message =
    reported.length > 0
      ? reported.split('\n').slice(-5).join('\n')
      : ERROR_MESSAGES[code];
  return { code, message };
}
