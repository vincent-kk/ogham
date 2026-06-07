import { ERROR_MESSAGES } from '../../constants/errorCodes.js';
import type { ConversationError } from '../../types/index.js';

import { type MapErrorInput, classify } from './utils/classify.js';

export function mapError(input: MapErrorInput): ConversationError {
  const code = classify(input);
  const stderr = input.stderr.trim();
  const message =
    stderr.length > 0
      ? stderr.split('\n').slice(-5).join('\n')
      : ERROR_MESSAGES[code];
  return { code, message };
}
