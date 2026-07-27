import type { PreToolUseInput } from '../../../../../types/hooks.js';

export function projectEdit(
  current: string,
  oldString: string,
  newString: string,
  input: PreToolUseInput,
): string {
  return input.tool_input.replace_all === true
    ? current.split(oldString).join(newString)
    : current.replace(oldString, () => newString);
}
