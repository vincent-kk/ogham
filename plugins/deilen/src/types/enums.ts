// Single source of truth for deilen's domain string-constant value sets. Pure
// `as const` objects with no zod/node imports; server schemas build on these via
// z.nativeEnum. The standalone page scripts (src/mcp/pages/**/scripts) are
// self-contained and keep inline literals instead of importing this.

export const Theme = {
  Light: "light",
  Dark: "dark",
  Auto: "auto",
} as const;
export type Theme = (typeof Theme)[keyof typeof Theme];

export const FeedbackStatus = {
  InProgress: "in_progress",
  Complete: "complete",
} as const;
export type FeedbackStatus =
  (typeof FeedbackStatus)[keyof typeof FeedbackStatus];

export const FeedbackIntent = {
  Revise: "revise",
  Discuss: "discuss",
  Dismiss: "dismiss",
} as const;
export type FeedbackIntent =
  (typeof FeedbackIntent)[keyof typeof FeedbackIntent];

export const ImageSource = {
  Clipboard: "clipboard",
  File: "file",
} as const;
export type ImageSource = (typeof ImageSource)[keyof typeof ImageSource];

export const SessionStatus = {
  Serving: "serving",
  Closed: "closed",
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

// long-poll resolver settle kinds (server-side only).
export const SettleKind = {
  Complete: "complete",
  Pending: "pending",
  Superseded: "superseded",
  Closing: "closing",
  Aborted: "aborted",
} as const;
export type SettleKind = (typeof SettleKind)[keyof typeof SettleKind];
