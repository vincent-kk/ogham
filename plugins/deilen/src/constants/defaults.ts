import type { Config } from "../types/config.js";
import { FeedbackIntent, Theme } from "../types/enums.js";

export const DEFAULT_CONFIG: Config = {
  theme: Theme.Auto,
  auto_open: true,
  collect_timeout_seconds: 600,
  session_ttl_hours: 72,
  idle_shutdown_minutes: 1,
  preferred_port: 0,
  content_width_px: 820,
  font_family: "",
  renderers: { mermaid: true, highlight: true, math: true },
  last_intent: FeedbackIntent.Revise,
  max_image_mb: 10,
  max_payload_mb: 50,
  max_viewer_mb: 5,
};

export const DIR_MODE = 0o700;
export const FILE_MODE = 0o600;

/**
 * Hard cap on collect_feedback long-poll wait. Bounded by the MCP stdio idle
 * window (30 min default), which aborts a tool call that sends nothing for that
 * long; stdio has no per-request timer, and MCP_TOOL_TIMEOUT defaults to ~28h.
 */
export const MAX_COLLECT_WAIT_SECONDS = 600;

/** Viewer heartbeat cadence (POST /api/ping). Server idle uses idle_shutdown_minutes. */
export const HEARTBEAT_INTERVAL_MS = 30_000;

/** Allowed inbound image mime types for feedback uploads. */
export const ALLOWED_IMAGE_MIME = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

/** mime -> stored file extension. */
export const IMAGE_EXT_BY_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
} as const;

/**
 * Preview display: local-image file extension -> mime, for the file:// rewrite
 * served at /api/image. Separate from ALLOWED_IMAGE_MIME (inbound feedback
 * uploads) so svg display never widens the upload surface.
 */
export const DISPLAY_IMAGE_MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
} as const;
