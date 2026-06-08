/** Formats milliseconds as `H:MM:SS` (hours dropped when zero → `M:SS`). */
export function formatTimestamp(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
}

/** Formats a duration given in seconds. */
export function formatDuration(totalSec: number): string {
  return formatTimestamp(Math.max(0, Math.floor(totalSec)) * 1000);
}
