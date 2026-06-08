import type { GithubRelease } from './version.js';

const DAY_MS = 86_400_000;

/**
 * Pure cooldown selection (ADR-4): newest non-draft/prerelease release published
 * at least `cooldownDays` ago. Returns null when none qualify.
 */
export function selectSafeRelease(
  releases: GithubRelease[],
  cooldownDays: number,
  now: number,
): GithubRelease | null {
  const cutoff = now - cooldownDays * DAY_MS;
  const eligible = releases
    .filter(
      (r) =>
        !r.draft &&
        !r.prerelease &&
        typeof r.tag_name === 'string' &&
        r.tag_name.length > 0,
    )
    .map((r) => ({ release: r, ts: Date.parse(r.published_at) }))
    .filter((x) => Number.isFinite(x.ts) && x.ts <= cutoff)
    .sort((a, b) => b.ts - a.ts);
  return eligible[0]?.release ?? null;
}
