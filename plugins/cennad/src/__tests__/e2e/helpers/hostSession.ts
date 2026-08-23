// Layer A reads this process's env; Layer B inherits it through spawn. Most
// fixtures exercise the explicit host channel, while legacy fixtures opt into
// the Claude PID compatibility channel by name.
export const HOST_SESSION_ID = 'cennad-e2e-session';
export const HOST_PID = 424242;

export function claimHostSession(): void {
  process.env.CENNAD_HOST_SESSION_ID = HOST_SESSION_ID;
  delete process.env.CLAUDE_PID;
}

export function claimLegacyClaudeSession(): void {
  delete process.env.CENNAD_HOST_SESSION_ID;
  process.env.CLAUDE_PID = String(HOST_PID);
}
