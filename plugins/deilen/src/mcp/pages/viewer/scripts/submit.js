// Feedback network: debounced text-only auto-save (in_progress) and the final
// multipart submission (complete) with image blobs.

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
  }, 600);
}

export async function submitFeedback(state, buildPayload, attachments) {
  if (saveTimer) window.clearTimeout(saveTimer);
  const form = new FormData();
  form.append("payload", JSON.stringify(buildPayload("complete")));
  for (const att of attachments) {
    form.append(`img_${att.id}`, att.blob, att.name);
  }
  try {
    const res = await fetch(feedbackUrl(state), { method: "POST", body: form });
    return res.ok;
  } catch {
    return false;
  }
}
