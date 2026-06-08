import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { ErrorCode } from '../../domain/errors.js';
import { toYtDlpError } from '../../domain/to-ytdlp-error.js';
import { truncate } from '../../postprocess/truncate.js';

// Actionable next-step appended to errors a cookie/proxy can resolve.
const CODE_HINTS: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.RATE_LIMITED]:
    ' Tip: set YTDLP_COOKIES_FROM_BROWSER or YTDLP_COOKIES_FILE (or YTDLP_PROXY) to reduce rate limiting.',
  [ErrorCode.BLOCKED]:
    ' Tip: YouTube requires sign-in; set YTDLP_COOKIES_FROM_BROWSER or YTDLP_COOKIES_FILE.',
  [ErrorCode.AGE_RESTRICTED]:
    ' Tip: age-restricted; set YTDLP_COOKIES_FROM_BROWSER or YTDLP_COOKIES_FILE for an authenticated session.',
  [ErrorCode.COOKIE_UNAVAILABLE]:
    ' Tip: close the browser that owns the profile, or switch to YTDLP_COOKIES_FILE.',
};

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
    const hint = CODE_HINTS[e.code] ?? '';
    return {
      content: [
        {
          type: 'text',
          text: `${options.errorPrefix} [${e.code}]: ${e.message}${hint}`,
        },
      ],
      isError: true,
    };
  }
}
