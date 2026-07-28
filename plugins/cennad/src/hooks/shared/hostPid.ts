// The pid of the Claude Code process this hook belongs to. `process.ppid` cannot
// answer it: hooks.json launches hooks through `libs/run.cjs`, which spawns the
// bundle one level down, so the hook's parent is the launcher. Claude Code
// exports its own pid as CLAUDE_PID and env survives that hop — the MCP server,
// a direct child, records the same number in runtime/counter.json.
export function hostPid(): number {
  const fromEnv = Number(process.env.CLAUDE_PID);
  if (Number.isInteger(fromEnv) && fromEnv > 0) return fromEnv;
  return process.ppid;
}
