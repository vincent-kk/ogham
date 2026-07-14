import { CLAUDE_PLUGIN_ROOT_VARIABLE } from "../../constants/hosts.js";

const VARIABLE_PREFIX = `${CLAUDE_PLUGIN_ROOT_VARIABLE}/`;

/**
 * Strips a leading `${CLAUDE_PLUGIN_ROOT}/` so the path resolves against the
 * plugin root (Codex/agy default cwd). Any other placement of the variable has
 * no portable meaning and throws.
 */
export function relativizePluginRootPath(argument: string): string {
  const relative = argument.startsWith(VARIABLE_PREFIX)
    ? argument.slice(VARIABLE_PREFIX.length)
    : argument;
  if (relative.includes(CLAUDE_PLUGIN_ROOT_VARIABLE))
    throw new Error(
      `\${CLAUDE_PLUGIN_ROOT} is only portable as an args path prefix: ${argument}`,
    );
  return relative;
}
