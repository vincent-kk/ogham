import type { CheckOutcome } from '../../../types/gates.js';
import type {
  PostToolUseFailureInput,
  PostToolUseInput,
} from '../../../types/hooks.js';

/** Optional exit header emitted by Claude and classic command wrappers. */
const EXIT_HEADER = /^Exit code:?\s+(\d+)(?:\r?\n|$)/;

/** Text with an optional exit parsed from its leading header. */
interface ParsedOutput {
  /** Output after removing a recognized exit header. */
  text: string;
  /** Parsed process exit code when present. */
  exit?: number;
}

/**
 * Read the output text carried by a host-specific response value.
 *
 * @param response Claude stdout/stderr object, Codex string, or unknown value.
 * @returns Combined observable text without inventing a missing channel.
 */
function readResponseText(response: unknown): string {
  if (typeof response === 'string') return response;
  if (typeof response !== 'object' || response === null) return '';
  const record = response as Record<string, unknown>;
  return [record.stdout, record.stderr]
    .filter((part): part is string => typeof part === 'string' && part !== '')
    .join('\n');
}

/**
 * Separate a recognized exit header from the evidence-bearing text.
 *
 * @param raw Host-provided output or failure text.
 * @returns Output text and an optional parsed exit code.
 */
function parseExitHeader(raw: string): ParsedOutput {
  const match = EXIT_HEADER.exec(raw);
  if (match === null) return { text: raw };
  return {
    text: raw.slice(match[0].length),
    exit: Number(match[1]),
  };
}

/**
 * Adapt one host hook payload to the text a gate can judge.
 *
 * @param input Claude or Codex tool-use payload.
 * @returns Host-neutral text, optional exit, and explicit interruption.
 */
export function toCheckOutcome(
  input: PostToolUseInput | PostToolUseFailureInput,
): CheckOutcome {
  const response = 'tool_response' in input ? input.tool_response : undefined;
  const raw =
    response !== undefined
      ? readResponseText(response)
      : 'error' in input && typeof input.error === 'string'
        ? input.error
        : '';
  const parsed = parseExitHeader(raw);
  return {
    ...parsed,
    ...(parsed.exit === undefined &&
    typeof response === 'object' &&
    response !== null
      ? { exit: 0 }
      : {}),
    ...('is_interrupt' in input && input.is_interrupt === true
      ? { interrupted: true }
      : {}),
  };
}
