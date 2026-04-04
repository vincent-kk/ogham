import type { HookOutput, PreToolUseInput } from '../types/hooks.js';

export function processPreToolUse(input: PreToolUseInput): HookOutput {
  // Context injection for .imbas/ file operations
  // When Read/Write/Edit targets files inside .imbas/, inject context about imbas state
  const { tool_input } = input;
  const filePath = (tool_input?.file_path as string) || (tool_input?.path as string) || '';

  if (filePath.includes('.imbas/') || filePath.includes('.imbas\\')) {
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext:
          '[imbas] Operating on imbas state directory. State files are managed by imbas MCP tools — prefer using imbas tools over direct file editing.',
      },
    };
  }

  return { continue: true };
}
