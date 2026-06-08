// Invariant yt-dlp invocation contract (PLAN §11 / ARCHITECTURE §6-4).

// Unit Separator (U+001F) — field delimiter for `--print` templates so titles
// containing commas/pipes never corrupt parsing. Built from its char code to keep
// the source ASCII-clean (no raw control character in the file).
export const FIELD_SEP = String.fromCharCode(0x1f);

// `--print` template producing the core video metadata on one stdout line.
export const META_PRINT_FIELDS = [
  'id',
  'title',
  'channel',
  'view_count',
  'duration',
  'upload_date',
] as const;

export const META_PRINT_FMT = META_PRINT_FIELDS.map((f) => `%(${f})s`).join(
  FIELD_SEP,
);

// JS challenge runtime: reuse the MCP server's own Node (ADR-3, no extra install).
export function jsRuntimeArg(nodePath: string): string[] {
  return ['--js-runtimes', `node:${nodePath}`];
}

// Flags applied to every invocation.
export const BASE_ARGS: string[] = ['--ignore-config', '--no-warnings'];

export const SUB_FORMAT = 'json3';
