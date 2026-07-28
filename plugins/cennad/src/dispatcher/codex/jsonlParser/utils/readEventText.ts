import type { EventLike } from './isObject.js';
import { readObject } from './readObject.js';
import { readString } from './readString.js';

export interface EventText {
  response?: string;
  errorMessage?: string;
}

function readItemMessage(event: EventLike): string | undefined {
  const item = readObject(event, 'item');
  if (!item || readString(item, 'type') !== 'agent_message') return undefined;
  return readString(item, 'text') ?? undefined;
}

function readFailureMessage(event: EventLike): string | undefined {
  const failure = readObject(event, 'error');
  return (failure ? readString(failure, 'message') : null) ?? undefined;
}

// Which field one codex event carries, if any. An unrecognised type yields nothing,
// which is how the stream stays parseable across upstream event renames.
export function readEventText(event: EventLike): EventText {
  const type = readString(event, 'type');
  if (type === 'item.completed') return { response: readItemMessage(event) };
  if (type === 'agent.message' || type === 'agent.complete')
    return { response: readString(event, 'text') ?? undefined };
  if (type === 'error')
    return { errorMessage: readString(event, 'message') ?? undefined };
  if (type === 'turn.failed')
    return { errorMessage: readFailureMessage(event) };
  return {};
}
