// Feedback network: debounced text-only auto-save (in_progress) and the final
// multipart submission (complete) with image blobs.

const AUTOSAVE_DEBOUNCE_MS = 500;

let saveTimer = null;

function feedbackUrl(state) {
  const session = encodeURIComponent(state.session_id || "");
  const token = encodeURIComponent(state.token || "");
  return `/api/feedback?session=${session}&token=${token}`;
}

export function scheduleAutoSave(state, buildPayload) {
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    fetch(feedbackUrl(state), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload("in_progress")),
      keepalive: true,
    }).catch(() => {});
  }, AUTOSAVE_DEBOUNCE_MS);
}

// Best-effort dismiss: a fire-and-forget keepalive POST so a waiting
// collect_feedback still settles as the tab closes. Never awaited — a closed,
// offline, or hung session must not block the viewer from closing.
export function sendDismiss(state, payload) {
  try {
    void fetch(feedbackUrl(state), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore — the tab closes regardless */
  }
}

export async function submitFeedback(state, buildPayload, attachments) {
  if (saveTimer) window.clearTimeout(saveTimer);
  const form = new FormData();
  form.append("payload", JSON.stringify(buildPayload("complete")));
  for (const attachment of attachments)
    form.append(`img_${attachment.id}`, attachment.blob, attachment.name);
  try {
    const response = await fetch(feedbackUrl(state), {
      method: "POST",
      body: form,
    });
    return response.ok;
  } catch {
    return false;
  }
}
