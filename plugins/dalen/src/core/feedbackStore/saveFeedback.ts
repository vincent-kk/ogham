import { sessionFeedbackPath } from "../../constants/paths.js";
import { atomicWrite } from "../../lib/atomicWrite.js";
import {
  type FeedbackPayload,
  type ImageRef,
  type StoredFeedback,
  StoredFeedbackSchema,
} from "../../types/feedback.js";
import { isoNow } from "../../utils/isoNow.js";

/** Persist a feedback payload (+ stored image metadata) to feedback.json. */
export async function saveFeedback(
  sessionId: string,
  payload: FeedbackPayload,
  images: ImageRef[],
): Promise<StoredFeedback> {
  const stored = StoredFeedbackSchema.parse({
    session_id: payload.session_id,
    status: payload.status,
    overall: payload.overall,
    comments: payload.comments,
    images,
    updated_at: isoNow(),
  });
  await atomicWrite(
    sessionFeedbackPath(sessionId),
    `${JSON.stringify(stored, null, 2)}\n`,
  );
  return stored;
}
