import type { ConversationOptions } from '../../types/index.js';

export function computeIgnoredOptions(
  options: ConversationOptions,
  supportedOptions: ReadonlySet<keyof ConversationOptions>,
): string[] {
  return Object.keys(options).filter(
    (key) => !supportedOptions.has(key as keyof ConversationOptions),
  );
}
