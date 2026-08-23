/**
 * Resolve the host conversation identity shared by the MCP server and hooks.
 * A process parent is deliberately not a fallback: `libs/run.cjs` adds a hop.
 */
export function resolveHostSessionIdentity(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const explicit = env.CENNAD_HOST_SESSION_ID?.trim();
  if (explicit) return explicit;

  const claudePid = Number(env.CLAUDE_PID);
  if (Number.isInteger(claudePid) && claudePid > 0)
    return `claude-pid:${claudePid}`;

  return null;
}
