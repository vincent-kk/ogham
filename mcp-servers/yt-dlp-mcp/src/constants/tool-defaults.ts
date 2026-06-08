/**
 * Default registration state per tool when `YTDLP_ENABLE_<TOOL>` is unset.
 * Single source of truth: keys define `EnableKey`; `config` derives the env var
 * name (SCREAMING_SNAKE) and the parsed flag from each entry.
 */
export const TOOL_DEFAULT_ENABLED = {
  search: true,
  transcript: true,
  metadata: true,
  playlist: true,
  listSubtitleLanguages: true,
  subtitles: false,
  metadataSummary: false,
  comments: false,
  commentsSummary: false,
  chapters: false,
  heatmap: false,
  thumbnail: false,
  downloadVideo: false,
  downloadAudio: false,
} as const satisfies Record<string, boolean>;

/** Registration gate keys — one per tool. */
export type EnableKey = keyof typeof TOOL_DEFAULT_ENABLED;
