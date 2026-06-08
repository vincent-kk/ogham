import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { ErrorCode } from '../../domain/errors.js';
import { toYtDlpError } from '../../domain/to-ytdlp-error.js';
import { truncate } from '../../postprocess/truncate.js';

// Actionable next-step appended to errors a proxy/cookie can resolve. Order
// reflects mitigation effectiveness: rotating proxy > request pacing > cookies.
const CODE_HINTS: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.RATE_LIMITED]:
    ' Tip: rate limits are IP-based — set YTDLP_PROXY_POOL (comma-separated rotating proxies) to spread requests across IPs, or lower concurrency / raise the interval knobs to pace bursts. Cookies rarely help with subtitle (timedtext) 429s.',
  [ErrorCode.BLOCKED]:
    ' Tip: YouTube bot-check — try YTDLP_PROXY_POOL for a cleaner IP. This often needs a Proof-of-Origin (PO) token; cookies (YTDLP_COOKIES_FROM_BROWSER / YTDLP_COOKIES_FILE) may not suffice on their own.',
  [ErrorCode.AGE_RESTRICTED]:
    ' Tip: age-restricted (a real auth gate) — set YTDLP_COOKIES_FROM_BROWSER or YTDLP_COOKIES_FILE for an authenticated session.',
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
