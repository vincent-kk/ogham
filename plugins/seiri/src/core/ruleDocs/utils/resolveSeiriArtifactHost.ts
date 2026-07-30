import type { ArtifactHost } from '@ogham/agent-artifacts';
import { resolveRuntimeHost } from '@ogham/cross-platform';

export function resolveSeiriArtifactHost(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ArtifactHost | null {
  const host = resolveRuntimeHost(env);
  if (host === 'codex') return 'codex';
  if (host === 'claude' || host === 'agy') return 'claude';
  return null;
}
