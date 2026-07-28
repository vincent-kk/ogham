import type { z } from 'zod';
import { type ZodTypeAny } from 'zod';

import type { McpToolName } from '../../../constants/mcpToolNames.js';
import { TOOL_INPUT_DIAGNOSTIC_CODE } from '../../../constants/toolEnvelope.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';

import { toolError } from './toolError.js';
import { toolResult } from './toolResult.js';

/** Subset of the MCP request extra forwarded to handlers (abort propagation). */
export interface HandlerExtra {
  signal?: AbortSignal;
}

/**
 * Wrap one payload-producing handler with the common artifact boundary.
 */
export function wrapHandler<Schema extends ZodTypeAny, Summary, Data>(
  toolName: McpToolName,
  schema: Schema,
  fn: (
    args: z.output<Schema>,
    extra?: HandlerExtra,
  ) => ToolPayload<Summary, Data> | Promise<ToolPayload<Summary, Data>>,
): (
  args: unknown,
  extra?: HandlerExtra,
) => Promise<
  | ReturnType<typeof toolResult>
  | ReturnType<typeof toolError>
  | { content: Array<{ type: 'text'; text: string }> }
> {
  return async (args: unknown, extra?: HandlerExtra) => {
    // Two failure classes, two diagnostic codes. Sharing one catch reported a
    // caller's malformed argument with the same code as an engine fault, and
    // the caller could not tell which one it had hit.
    let input: z.output<Schema>;
    try {
      input = await schema.parseAsync(args);
    } catch (error) {
      return toolError(error, TOOL_INPUT_DIAGNOSTIC_CODE);
    }
    try {
      return toolResult(toolName, await fn(input, extra));
    } catch (error) {
      return toolError(error);
    }
  };
}
