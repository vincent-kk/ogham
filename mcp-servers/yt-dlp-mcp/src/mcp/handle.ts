import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { toYtDlpError } from '../domain/to-ytdlp-error.js';
import { truncate } from '../postprocess/formatter.js';

export interface ToolSuccess {
  text: string;
  structuredContent?: Record<string, unknown>;
}

export interface HandleOptions {
  errorPrefix: string;
  characterLimit: number;
}

/**
 * Single funnel for every tool handler (PLAN §8): runs the action, truncates
 * text to the character limit, and converts any thrown value into a typed
 * `isError` result with a stable `[CODE]` prefix.
 */
export async function handleToolExecution(
  action: () => Promise<ToolSuccess>,
  options: HandleOptions,
): Promise<CallToolResult> {
  try {
    const { text, structuredContent } = await action();
    const content: CallToolResult['content'] = [
      { type: 'text', text: truncate(text, options.characterLimit) },
    ];
    return structuredContent ? { content, structuredContent } : { content };
  } catch (error) {
    const e = toYtDlpError(error);
    return {
      content: [{ type: 'text', text: `${options.errorPrefix} [${e.code}]: ${e.message}` }],
      isError: true,
    };
  }
}
