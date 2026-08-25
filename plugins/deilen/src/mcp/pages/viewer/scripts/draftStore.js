// Unsent-draft persistence: one localStorage entry per session, attachments
// serialized as data URLs so a reload can rebuild their Blobs. Entries are
// removed when the draft is consumed (submit/dismiss) or older than the TTL.
// Every storage touch is guarded: a blocked or full store degrades to "no
// persistence", never to a broken page. The guard helpers below exceed the
// two-helper default on purpose — they are this storage seam's own boundary.

const KEY_PREFIX = "deilen:draft:";
// Chrome caps localStorage near 5M UTF-16 units per origin; leave headroom for
// the text entry itself.
const MAX_SERIALIZED_ATTACHMENT_CHARS = 3_500_000;

function draftKey(sessionId) {
  return `${KEY_PREFIX}${sessionId}`;
}

function readDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

// The data URL is cached on the attachment so a large image is encoded once,
// not on every keystroke that re-saves the draft.
async function serializeAttachments(attachments) {
  const records = [];
  for (const attachment of attachments) {
    if (!attachment.dataUrl)
      attachment.dataUrl = await readDataUrl(attachment.blob);
    records.push({
      id: attachment.id,
      name: attachment.name,
      type: attachment.blob.type,
      dataUrl: attachment.dataUrl,
    });
  }
  return records;
}

function blobFromDataUrl(dataUrl, type) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

export function deserializeAttachments(records) {
  return (records || []).map((record) => {
    const blob = blobFromDataUrl(record.dataUrl, record.type);
    return {
      id: record.id,
      blob,
      name: record.name,
      url: URL.createObjectURL(blob),
      source: "restored",
      dataUrl: record.dataUrl,
    };
  });
}

function write(key, entry) {
  localStorage.setItem(key, JSON.stringify(entry));
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable — nothing to remove */
  }
}

function stripAttachments(entry) {
  return {
    ...entry,
    imagesDropped: true,
    comments: entry.comments.map((comment) => ({
      ...comment,
      attachments: [],
    })),
    overall: entry.overall.map((note) => ({ ...note, attachments: [] })),
  };
}

function serializedAttachmentChars(entry) {
  let total = 0;
  for (const item of [...entry.comments, ...entry.overall])
    for (const attachment of item.attachments)
      total += attachment.dataUrl.length;
  return total;
}

function isAttachmentRecord(record) {
  return (
    record !== null &&
    typeof record === "object" &&
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.type === "string" &&
    typeof record.dataUrl === "string" &&
    record.dataUrl.startsWith("data:")
  );
}

function isAnchor(anchor) {
  return (
    anchor === null ||
    (anchor !== null &&
      typeof anchor === "object" &&
      Number.isInteger(anchor.startLine) &&
      Number.isInteger(anchor.endLine) &&
      typeof anchor.sourceText === "string")
  );
}

function isNoteRecord(record, withAnchor) {
  return (
    record !== null &&
    typeof record === "object" &&
    typeof record.id === "string" &&
    typeof record.text === "string" &&
    (!withAnchor || isAnchor(record.anchor)) &&
    Array.isArray(record.attachments) &&
    record.attachments.every(isAttachmentRecord)
  );
}

function parseEntry(raw) {
  const entry = JSON.parse(raw);
  if (
    !entry ||
    typeof entry.savedAt !== "number" ||
    !Array.isArray(entry.comments) ||
    !Array.isArray(entry.overall) ||
    !entry.comments.every((comment) => isNoteRecord(comment, true)) ||
    !entry.overall.every((note) => isNoteRecord(note, false))
  )
    throw new Error("malformed draft");
  return entry;
}

/**
 * Persist the draft. `shouldWrite` is consulted after attachment encoding and
 * right before the write, so a submit or dismiss that happened meanwhile wins.
 * On a storage failure the entry is written again without attachments.
 */
export async function saveDraft(sessionId, snapshot, options = {}) {
  const now = options.now ?? Date.now();
  const shouldWrite = options.shouldWrite ?? (() => true);
  let entry = {
    savedAt: now,
    comments: await Promise.all(
      snapshot.comments.map(async (comment) => ({
        id: comment.id,
        anchor: comment.anchor,
        text: comment.text,
        resolved: Boolean(comment.resolved),
        attachments: await serializeAttachments(comment.attachments || []),
      })),
    ),
    overall: await Promise.all(
      snapshot.overall.map(async (note) => ({
        id: note.id,
        text: note.text,
        attachments: await serializeAttachments(note.attachments || []),
      })),
    ),
  };
  if (!shouldWrite()) return { ok: false, imagesDropped: false, skipped: true };
  let imagesDropped = false;
  if (serializedAttachmentChars(entry) > MAX_SERIALIZED_ATTACHMENT_CHARS) {
    entry = stripAttachments(entry);
    imagesDropped = true;
  }
  try {
    write(draftKey(sessionId), entry);
    return { ok: true, imagesDropped, skipped: false };
  } catch {
    try {
      write(draftKey(sessionId), stripAttachments(entry));
      return { ok: true, imagesDropped: true, skipped: false };
    } catch {
      return { ok: false, imagesDropped: true, skipped: false };
    }
  }
}

export function loadDraft(sessionId) {
  const key = draftKey(sessionId);
  let raw = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return parseEntry(raw);
  } catch {
    remove(key);
    return null;
  }
}

export function clearDraft(sessionId) {
  remove(draftKey(sessionId));
}

function draftKeys() {
  const keys = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(KEY_PREFIX)) keys.push(key);
    }
  } catch {
    /* storage unavailable — nothing to prune */
  }
  return keys;
}

/** Remove every draft older than ttlMs (or unreadable); returns the count removed. */
export function pruneDrafts(ttlMs, now = Date.now()) {
  const stale = [];
  for (const key of draftKeys()) {
    try {
      const entry = parseEntry(localStorage.getItem(key) || "");
      if (now - entry.savedAt > ttlMs) stale.push(key);
    } catch {
      stale.push(key);
    }
  }
  for (const key of stale) remove(key);
  return stale.length;
}
