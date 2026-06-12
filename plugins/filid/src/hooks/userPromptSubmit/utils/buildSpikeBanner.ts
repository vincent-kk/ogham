import { SPIKE_TIMEBOX_DAYS } from '../../../constants/spikeMode.js';
import { isSpikeBranch } from '../../utils/isSpikeBranch.js';
import { readBranchReflog } from '../../utils/readBranchReflog.js';
import { readCurrentBranch } from '../../utils/readCurrentBranch.js';
import { readHarvestManifest } from '../../utils/readHarvestManifest.js';
import { readHeadSha } from '../../utils/readHeadSha.js';

const DAY_MS = 86_400_000;

/**
 * Per-prompt spike banner. Deliberately bypasses the session-first cache:
 * mode can flip mid-session (checkout), so the judgment must be fresh on
 * every prompt — a handful of small fs reads, no git spawn.
 *
 * Dynamic content: elapsed day (branch reflog first entry), unharvested
 * decision count (reflog ref updates — machine-computable proxy for spike
 * commits), timebox emphasis past SPIKE_TIMEBOX_DAYS, and harvest manifest
 * state (missing / stale / current vs HEAD).
 *
 * Returns null off spike branches.
 */
export function buildSpikeBanner(cwd: string): string | null {
  const branch = readCurrentBranch(cwd);
  if (branch === null || !isSpikeBranch(branch)) return null;

  const reflog = readBranchReflog(cwd, branch);
  const elapsedDays =
    reflog?.createdAtMs != null
      ? Math.max(0, Math.floor((Date.now() - reflog.createdAtMs) / DAY_MS))
      : null;
  const dayLabel = elapsedDays === null ? 'day ?' : `day ${elapsedDays + 1}`;

  const lines: string[] = [
    `[filid:spike] SPIKE MODE — branch ${branch} (${dayLabel}, timebox ` +
      `${SPIKE_TIMEBOX_DAYS}d). Doc-hygiene denies (INTENT 50-line / 3-tier ` +
      `/ DETAIL append-only) suspended; criteria ledger lint and ` +
      `review-stage security rules unchanged.`,
  ];

  if (elapsedDays !== null && elapsedDays >= SPIKE_TIMEBOX_DAYS) {
    lines.push(
      `[filid:spike] ⚠ TIMEBOX EXCEEDED — harvest accuracy degrades as the ` +
        `diff grows; run /filid:harvest now.`,
    );
  }

  const manifest = readHarvestManifest(cwd, branch);
  if (manifest === null) {
    const updates = reflog?.updateCount ?? '?';
    lines.push(
      `[filid:spike] Unharvested decisions (ref updates): ${updates}. Exit ` +
        `ONLY via /filid:harvest (keep/discard/defer interview) — review ` +
        `without a harvest manifest degrades to INSUFFICIENT-EVIDENCE ` +
        `(harvest-required).`,
    );
  } else {
    const headSha = readHeadSha(cwd);
    const sealedMs =
      manifest.created_at === undefined
        ? Number.NaN
        : Date.parse(manifest.created_at);
    const expired =
      Number.isFinite(sealedMs) &&
      Date.now() - sealedMs > SPIKE_TIMEBOX_DAYS * DAY_MS;
    if (
      manifest.head_sha === undefined ||
      headSha === null ||
      manifest.head_sha !== headSha
    ) {
      lines.push(
        `[filid:spike] Harvest manifest STALE — head moved past ` +
          `${manifest.head_sha?.slice(0, 7) ?? '?'}. Re-run /filid:harvest ` +
          `before merge-track entry.`,
      );
    } else if (expired) {
      lines.push(
        `[filid:spike] Harvest manifest EXPIRED — sealed more than ` +
          `${SPIKE_TIMEBOX_DAYS}d ago; review/pipeline treat it as ` +
          `unharvested. Re-run /filid:harvest before merge-track entry.`,
      );
    } else {
      lines.push(
        `[filid:spike] Harvest manifest current (head ` +
          `${headSha.slice(0, 7)}). Finalize spike disposal (discard by ` +
          `default, or promote); any new commit invalidates the manifest.`,
      );
    }
  }

  return lines.join('\n');
}
