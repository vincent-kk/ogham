// Renders provider names for prose: "codex", "codex or antigravity",
// "codex, antigravity, or claude".
export function providerList(providers: readonly string[]): string {
  if (providers.length <= 1) return providers[0] ?? '';
  if (providers.length === 2) return `${providers[0]} or ${providers[1]}`;
  const last = providers[providers.length - 1];
  return `${providers.slice(0, -1).join(', ')}, or ${last}`;
}
