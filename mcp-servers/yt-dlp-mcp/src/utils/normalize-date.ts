/** Converts yt-dlp's `YYYYMMDD` upload date to `YYYY-MM-DD`; undefined if absent. */
export function normalizeUploadDate(
  value: string | undefined,
): string | undefined {
  if (!value || value === 'NA' || !/^\d{8}$/.test(value)) return undefined;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}
