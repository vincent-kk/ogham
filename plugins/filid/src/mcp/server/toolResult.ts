import { mapReplacer } from './mapReplacer.js';

/**
 * Wrap a tool handler result in the MCP `content` envelope.
 *
 * Output is **compact JSON** (no indentation). Pretty-printing inflated every
 * MCP response by ~30% with no LLM benefit — JSON parsers ignore whitespace
 * and tokenizers count it. Set `FILID_PRETTY_JSON=1` to opt back into
 * 2-space indentation for human debugging via stderr/log capture.
 */
export function toolResult(result: unknown) {
  const indent = process.env.FILID_PRETTY_JSON === '1' ? 2 : undefined;
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, mapReplacer, indent),
      },
    ],
  };
}
