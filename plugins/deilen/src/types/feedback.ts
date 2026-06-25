import { z } from "zod";

import { FeedbackIntent, FeedbackStatus, ImageSource } from "./enums.js";

export const AnchorSchema = z.object({
  startLine: z.number().int().min(1),
  endLine: z.number().int().min(1),
  sourceText: z.string(),
});
export type Anchor = z.infer<typeof AnchorSchema>;

export const CommentSchema = z.object({
  id: z.string().min(1),
  anchor: AnchorSchema.nullable(),
  text: z.string(),
  imageIds: z.array(z.string()).default([]),
  resolved: z.boolean().optional(),
});
export type Comment = z.infer<typeof CommentSchema>;

export const OverallNoteSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  imageIds: z.array(z.string()).default([]),
});
export type OverallNote = z.infer<typeof OverallNoteSchema>;

export const FeedbackStatusSchema = z.nativeEnum(FeedbackStatus);

export const FeedbackIntentSchema = z.nativeEnum(FeedbackIntent);

export const FeedbackPayloadSchema = z.object({
  session_id: z.string().min(1),
  status: FeedbackStatusSchema,
  intent: FeedbackIntentSchema.optional(),
  overall: z.array(OverallNoteSchema).default([]),
  comments: z.array(CommentSchema).default([]),
});
export type FeedbackPayload = z.infer<typeof FeedbackPayloadSchema>;

export const ImageSourceSchema = z.nativeEnum(ImageSource);

/** Server-internal image metadata recorded in feedback.json. */
export const ImageRefSchema = z.object({
  id: z.string(),
  mimeType: z.string(),
  filename: z.string().optional(),
  source: ImageSourceSchema,
  bytes: z.number().int().nonnegative(),
  path: z.string(),
});
export type ImageRef = z.infer<typeof ImageRefSchema>;

/** Persisted feedback record: latest payload plus stored image metadata. */
export const StoredFeedbackSchema = z.object({
  session_id: z.string(),
  status: FeedbackStatusSchema,
  intent: FeedbackIntentSchema.optional(),
  overall: z.array(OverallNoteSchema).default([]),
  comments: z.array(CommentSchema).default([]),
  images: z.array(ImageRefSchema).default([]),
  updated_at: z.string(),
});
export type StoredFeedback = z.infer<typeof StoredFeedbackSchema>;
