// Session identity for runtime/counter.json. Prefer CLAUDE_PID — the pid Claude
// Code exports for itself — so this matches what the hooks resolve; they run
// below `libs/run.cjs` and cannot read the host from process.ppid at all
// (mirror: src/hooks/shared/hostPid.ts).
export function getParentPid(): number {
  const fromEnv = Number(process.env.CLAUDE_PID);
  if (Number.isInteger(fromEnv) && fromEnv > 0) return fromEnv;
  return typeof process.ppid === 'number' ? process.ppid : -1;
}
