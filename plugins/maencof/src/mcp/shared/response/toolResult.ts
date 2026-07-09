/**
 * @file toolResult.ts
 * @description MCP 성공 응답 포맷
 */
import { mapReplacer } from './mapReplacer.js';

export function toolResult(result: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, mapReplacer, 2),
      },
    ],
  };
}
