import { mapReplacer } from './map-replacer.js';

export function toolResult(result: unknown) {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(result, mapReplacer, 2) },
    ],
  };
}
