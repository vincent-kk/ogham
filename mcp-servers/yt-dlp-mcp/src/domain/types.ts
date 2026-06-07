// Domain types — the boundary contract between yt-dlp output and MCP responses.
// Untrusted yt-dlp/site output is parsed into these shapes before anything else
// in the system touches it (ARCHITECTURE §6, §10 trust boundary).

export interface TranscriptSegment {
  text: string;
  startMs: number;
  durationMs: number;
}

export interface VideoMetadata {
  videoId: string;
  title: string;
  channel: string;
  channelId?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  durationSec?: number;
  uploadDate?: string;
  description?: string;
  tags?: string[];
  categories?: string[];
  thumbnailUrl?: string;
  webpageUrl?: string;
  isLive?: boolean;
}

export interface TranscriptResult {
  videoId: string;
  language: string;
  availableSubs: string[];
  segments: TranscriptSegment[];
  metadata: VideoMetadata;
  source: 'yt-dlp';
  warnings: string[];
}

export interface SubtitleTrack {
  language: string;
  ext: string;
  isAutomatic: boolean;
  name?: string;
}

export interface SubtitleLanguageList {
  videoId: string;
  manual: SubtitleTrack[];
  automatic: SubtitleTrack[];
}

export interface RawSubtitleResult {
  videoId: string;
  language: string;
  format: string;
  content: string;
  segments?: TranscriptSegment[];
}

export interface Chapter {
  title: string;
  startMs: number;
  endMs?: number;
}

export interface ChapterList {
  videoId: string;
  chapters: Chapter[];
}

export interface HeatmapSpan {
  startMs: number;
  endMs: number;
  score: number;
}

export interface Heatmap {
  videoId: string;
  spans: HeatmapSpan[];
}

export interface CommentNode {
  id: string;
  text: string;
  author: string;
  authorId?: string;
  likeCount?: number;
  isPinned?: boolean;
  isUploader?: boolean;
  isFavorited?: boolean;
  timestamp?: number;
  timeText?: string;
  parent?: string;
  depth: number;
  replies?: CommentNode[];
}

export interface CommentResult {
  videoId: string;
  count: number;
  rootCount: number;
  replyCount: number;
  comments: CommentNode[];
}

export interface DownloadResult {
  path: string;
  bytes: number;
  format: string;
}

export interface ThumbnailResult {
  path: string;
  bytes: number;
  url?: string;
}

export interface PlaylistEntry {
  id: string;
  title: string;
  url: string;
  uploader?: string;
  durationSec?: number;
}

export interface PlaylistResult {
  id?: string;
  title?: string;
  uploader?: string;
  count: number;
  entries: PlaylistEntry[];
}

export interface SearchResultItem {
  id: string;
  title: string;
  url: string;
  uploader?: string;
  durationSec?: number;
  uploadDate?: string;
  viewCount?: number;
}

export interface SearchResult {
  query: string;
  count: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number;
  items: SearchResultItem[];
}
