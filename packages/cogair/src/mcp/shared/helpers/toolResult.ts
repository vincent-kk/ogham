import { mapReplacer } from '../../../utils/mapReplacer.js';

export function toolResult(result: unknown): {
  content: Array<{ type: 'text'; text: string }>;
} {
  const indent = process.env.COGAIR_PRETTY_JSON === '1' ? 2 : undefined;
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, mapReplacer, indent),
      },
    ],
  };
}
