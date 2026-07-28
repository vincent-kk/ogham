// Hooks resolve their session through CLAUDE_PID (see hooks/shared/hostPid.ts):
// hooks.json launches them below `libs/run.cjs`, so process.ppid points at the
// launcher rather than the host. A suite that writes a counter must claim a host
// pid the same way a real session does — Layer A reads this process's env,
// Layer B inherits it through spawn.
export const HOST_PID = 424242;

export function claimHostSession(): void {
  process.env.CLAUDE_PID = String(HOST_PID);
}
