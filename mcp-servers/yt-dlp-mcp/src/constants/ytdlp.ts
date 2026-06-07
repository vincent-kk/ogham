// Invariant yt-dlp invocation contract (PLAN §11 / ARCHITECTURE §6-4).

// Unit Separator — used as the field delimiter for `--print` templates so titles
// containing commas/pipes never corrupt parsing.
export const FIELD_SEP = '';

// `--print` template producing the core video metadata on one stdout line.
export const META_PRINT_FIELDS = [
  'id',
  'title',
  'channel',
  'view_count',
  'duration',
  'upload_date',
] as const;

export const META_PRINT_FMT = META_PRINT_FIELDS.map((f) => `%(${f})s`).join(FIELD_SEP);

// JS challenge runtime: reuse the MCP server's own Node (ADR-3, no extra install).
export function jsRuntimeArg(nodePath: string): string[] {
  return ['--js-runtimes', `node:${nodePath}`];
}

// Flags applied to every invocation.
export const BASE_ARGS: string[] = ['--ignore-config', '--no-warnings'];

export const SUB_FORMAT = 'json3';
