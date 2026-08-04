/**
 * @file toolResult.ts
 * @description MCP 성공 응답 포맷 — compact JSON. 응답은 LLM 컨텍스트로
 * 들어가므로 들여쓰기·개행이 곧 토큰 비용이다.
 */
import { mapReplacer } from './mapReplacer.js';

export function toolResult(result: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, mapReplacer),
      },
    ],
  };
}
