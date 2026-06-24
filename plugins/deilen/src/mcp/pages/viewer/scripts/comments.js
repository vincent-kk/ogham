// Line-anchored commenting + multiple overall notes: a block's gutter "+" or a
// text selection opens a comment composer; the "Overall note" button opens a
// separate overall composer. Both live in in-memory stores, render as sidebar
// cards, and debounce-save as text-only drafts until the final multipart submit.
// The submit carries an intent — revise (apply + reopen), discuss (continue the
// conversation), or dismiss (close) — that tells Claude what to do next.

import { wireImageCapture } from "./images.js";
import { scheduleAutoSave, submitFeedback } from "./submit.js";

const POPOVER_OFFSET_PX = 8;

let view = {};
const store = { comments: new Map(), overall: new Map() };
let sequence = 0;
let overallSequence = 0;
let popover = null;
// "connecting" | "alive" | "ended" (session closed) | "offline" (server down)
let connectionState = "connecting";
let submitted = false;

function getElement(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.class) node.className = options.class;
  if (options.text != null) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs))
      node.setAttribute(key, value);
  }
  return node;
}

function rawSlice(startLine, endLine) {
  return (view.raw || "")
    .split("\n")
    .slice(startLine - 1, endLine)
    .join("\n")
    .trim();
}

function rangeAnchor(startBlock, endBlock) {
  const startBlockLine = Number(startBlock.dataset.sourceLine);
  const endBlockLine = Number(
    endBlock.dataset.sourceEnd || endBlock.dataset.sourceLine,
  );
  const firstLine = Math.min(startBlockLine, endBlockLine);
  const lastLine = Math.max(startBlockLine, endBlockLine);
  return {
    startLine: firstLine,
    endLine: lastLine,
    sourceText: rawSlice(firstLine, lastLine),
  };
}

function nearestAnchor(node) {
  let cursor = node instanceof Element ? node : node?.parentElement;
  while (cursor && cursor.id !== "viewer") {
    if (cursor.hasAttribute?.("data-source-line")) return cursor;
    cursor = cursor.parentElement;
  }
  return null;
}

function dispatchChange() {
  renderSidebar();
  // Don't fire doomed auto-saves at a closed/dead session; mirror the
  // submit-button disable gate.
  if (connectionState !== "ended" && connectionState !== "offline")
    scheduleAutoSave(view, (status) =>
      buildPayload(status, view.last_intent || "revise"),
    );
}

function buildPayload(status, intent) {
  return {
    session_id: view.session_id,
    status,
    intent,
    overall: [...store.overall.values()].map((note) => ({
      id: note.id,
      text: note.text,
    })),
    comments: [...store.comments.values()].map((comment) => ({
      id: comment.id,
      anchor: comment.anchor,
      text: comment.text,
      imageIds: comment.attachments.map((attachment) => attachment.id),
      resolved: comment.resolved || undefined,
    })),
  };
}

function allAttachments() {
  const collected = [];
  for (const comment of store.comments.values())
    collected.push(...comment.attachments);
  return collected;
}

/* ── Comment composer ─────────────────────────────────── */
function openComposer(anchor, editing) {
  const list = document.getElementById("comment-list");
  commitOpenComposer();
  const attachments = editing ? [...editing.attachments] : [];

  const card = getElement("div", { class: "composer" });
  card.dataset.composer = "true";

  const chip = getElement("div", {
    class: anchor ? "anchor-chip" : "anchor-chip overall",
    text: anchor ? `L${anchor.startLine}-${anchor.endLine}` : "general",
  });
  const textarea = getElement("textarea", {
    attrs: { placeholder: "Leave a comment…" },
  });
  textarea.value = editing ? editing.text : "";
  const thumbs = getElement("div", { class: "thumbs" });

  function renderThumbs() {
    thumbs.replaceChildren();
    attachments.forEach((attachment, index) => {
      const wrapper = getElement("div", { class: "thumb" });
      const imageElement = getElement("img");
      imageElement.src = attachment.url;
      imageElement.alt = attachment.name;
      const removeButton = getElement("button", {
        class: "thumb-remove",
        type: "button",
        text: "x",
      });
      removeButton.addEventListener("click", () => {
        URL.revokeObjectURL(attachment.url);
        attachments.splice(index, 1);
        renderThumbs();
      });
      wrapper.append(imageElement, removeButton);
      thumbs.append(wrapper);
    });
  }

  const actions = getElement("div", { class: "composer-actions" });
  const cancel = getElement("button", {
    class: "btn",
    type: "button",
    text: "Cancel",
  });
  const save = getElement("button", {
    class: "btn btn-primary",
    type: "button",
    text: "Save",
  });
  cancel.addEventListener("click", closeComposer);
  save.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (!text && attachments.length === 0) return;
    if (editing) {
      editing.text = text;
      editing.attachments = attachments;
    } else {
      sequence += 1;
      const id = `c${sequence}`;
      store.comments.set(id, {
        id,
        anchor,
        text,
        attachments,
        resolved: false,
      });
    }
    closeComposer();
    markAnchored();
    dispatchChange();
  });
  actions.append(cancel, save);

  wireImageCapture(card, (attachment) => {
    attachments.push(attachment);
    renderThumbs();
  });
  textarea.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") save.click();
    if (event.key === "Escape") closeComposer();
  });

  card.append(chip, textarea, thumbs, actions);
  list.prepend(card);
  renderThumbs();
  textarea.focus();
}

// Before opening another composer, don't discard the one in progress: auto-save
// it when it has text, otherwise drop the empty shell.
function commitOpenComposer() {
  const existing = document.querySelector(
    '#comment-list [data-composer="true"]',
  );
  if (!existing) return;
  const textarea = existing.querySelector("textarea");
  const hasText = Boolean(textarea && textarea.value.trim());
  const hasAttachment = Boolean(existing.querySelector(".thumb"));
  if (hasText || hasAttachment) {
    existing.querySelector(".btn-primary")?.click();
  } else {
    existing.remove();
  }
}

function closeComposer() {
  document.querySelector('#comment-list [data-composer="true"]')?.remove();
}

/* ── Overall composer (text-only, no anchor) ──────────── */
function openOverallComposer(editing) {
  const list = document.getElementById("comment-list");
  commitOpenComposer();

  const card = getElement("div", { class: "composer" });
  card.dataset.composer = "true";

  const chip = getElement("div", {
    class: "anchor-chip overall",
    text: "Overall",
  });
  const textarea = getElement("textarea", {
    attrs: { placeholder: "Overall note (one topic)…" },
  });
  textarea.value = editing ? editing.text : "";

  const actions = getElement("div", { class: "composer-actions" });
  const cancel = getElement("button", {
    class: "btn",
    type: "button",
    text: "Cancel",
  });
  const save = getElement("button", {
    class: "btn btn-primary",
    type: "button",
    text: "Save",
  });
  cancel.addEventListener("click", closeComposer);
  save.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (!text) return;
    if (editing) editing.text = text;
    else {
      overallSequence += 1;
      const id = `o${overallSequence}`;
      store.overall.set(id, { id, text });
    }
    closeComposer();
    dispatchChange();
  });
  actions.append(cancel, save);

  textarea.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") save.click();
    if (event.key === "Escape") closeComposer();
  });

  card.append(chip, textarea, actions);
  list.prepend(card);
  textarea.focus();
}

/* ── Sidebar cards ────────────────────────────────────── */
function overallNoteCard(note) {
  const card = getElement("div", { class: "comment-card" });
  const chip = getElement("div", { class: "anchor-chip overall" });
  chip.append(getElement("span", { text: "Overall" }));

  const body = getElement("div", { class: "comment-body", text: note.text });

  const actions = getElement("div", { class: "comment-actions" });
  const edit = getElement("button", {
    class: "mini-btn",
    type: "button",
    text: "Edit",
  });
  const del = getElement("button", {
    class: "mini-btn danger",
    type: "button",
    text: "Delete",
  });
  edit.addEventListener("click", () => openOverallComposer(note));
  del.addEventListener("click", () => {
    store.overall.delete(note.id);
    dispatchChange();
  });
  actions.append(edit, del);

  card.append(chip, body, actions);
  return card;
}

function commentCard(comment) {
  const card = getElement("div", {
    class: comment.resolved ? "comment-card resolved" : "comment-card",
  });
  const chip = getElement("div", {
    class: comment.anchor ? "anchor-chip" : "anchor-chip overall",
  });
  chip.append(
    getElement("span", {
      text: comment.anchor
        ? `L${comment.anchor.startLine}-${comment.anchor.endLine}`
        : "general",
    }),
  );
  if (comment.anchor?.sourceText) {
    chip.append(
      getElement("span", {
        class: "anchor-excerpt",
        text: comment.anchor.sourceText.split("\n")[0],
      }),
    );
  }
  chip.addEventListener("click", () => scrollToAnchor(comment.anchor));

  const body = getElement("div", { class: "comment-body", text: comment.text });

  const actions = getElement("div", { class: "comment-actions" });
  const editButton = getElement("button", {
    class: "mini-btn",
    type: "button",
    text: "Edit",
  });
  const resolve = getElement("button", {
    class: "mini-btn",
    type: "button",
    text: comment.resolved ? "Unresolve" : "Resolve",
  });
  const deleteButton = getElement("button", {
    class: "mini-btn danger",
    type: "button",
    text: "Delete",
  });
  editButton.addEventListener("click", () =>
    openComposer(comment.anchor, comment),
  );
  resolve.addEventListener("click", () => {
    comment.resolved = !comment.resolved;
    dispatchChange();
  });
  deleteButton.addEventListener("click", () => {
    store.comments.delete(comment.id);
    markAnchored();
    dispatchChange();
  });
  actions.append(editButton, resolve, deleteButton);

  card.append(chip, body);
  if (comment.attachments.length) {
    const thumbs = getElement("div", { class: "thumbs" });
    for (const attachment of comment.attachments) {
      const wrapper = getElement("div", { class: "thumb" });
      const imageElement = getElement("img");
      imageElement.src = attachment.url;
      imageElement.alt = attachment.name;
      wrapper.append(imageElement);
      thumbs.append(wrapper);
    }
    card.append(thumbs);
  }
  card.append(actions);
  return card;
}

function renderSidebar() {
  const list = document.getElementById("comment-list");
  const composer = list.querySelector('[data-composer="true"]');
  list.replaceChildren();
  if (composer) list.append(composer);

  const overallNotes = [...store.overall.values()];
  for (const note of overallNotes) list.append(overallNoteCard(note));

  const comments = [...store.comments.values()].sort((anchorA, anchorB) => {
    const lineA = anchorA.anchor?.startLine ?? Number.MAX_SAFE_INTEGER;
    const lineB = anchorB.anchor?.startLine ?? Number.MAX_SAFE_INTEGER;
    return lineA - lineB;
  });
  for (const comment of comments) list.append(commentCard(comment));

  if (!composer && overallNotes.length === 0 && comments.length === 0) {
    list.append(
      getElement("p", {
        class: "sidebar-empty",
        text: "Select text or hover a block's + to leave a comment.",
      }),
    );
  }
  updateStatus();
}

function updateStatus() {
  const count = store.comments.size;
  const overallCount = store.overall.size;
  const badge = document.getElementById("comment-count");
  if (badge) {
    const total = count + overallCount;
    badge.hidden = total === 0;
    badge.textContent = String(total);
  }
  const status = document.getElementById("submit-status");
  if (status && !submitted) {
    const error =
      connectionState === "ended"
        ? "This session has ended — submit disabled"
        : connectionState === "offline"
          ? "Server offline — submit disabled"
          : "";
    if (error) {
      status.textContent = error;
      status.classList.add("status-error");
    } else {
      status.classList.remove("status-error");
      if (connectionState === "connecting") {
        status.textContent = "Checking server…";
      } else {
        const parts = [];
        if (count) parts.push(`${count} comment${count === 1 ? "" : "s"}`);
        if (overallCount)
          parts.push(
            `${overallCount} overall note${overallCount === 1 ? "" : "s"}`,
          );
        status.textContent = parts.length
          ? parts.join(" · ")
          : "No comments yet";
      }
    }
  }
  const total = count + overallCount;
  const alive = connectionState === "alive";
  const revise = document.getElementById("submit-revise");
  const discuss = document.getElementById("submit-discuss");
  // Both buttons share one style — only the disabled tone differs (no swapping
  // accent). Revise needs something to apply; discuss can continue with nothing.
  if (revise) revise.disabled = submitted || !alive || total === 0;
  if (discuss) discuss.disabled = submitted || !alive;
  const close = document.getElementById("close-viewer");
  if (close) close.disabled = submitted;
}

/* ── Anchors + selection ──────────────────────────────── */
let anchorBlocks = [];

function anchorTargets(viewer) {
  const targets = [...viewer.querySelectorAll("li[data-source-line]")];
  for (const child of viewer.children) {
    if (child.tagName === "UL" || child.tagName === "OL") continue;
    if (child.hasAttribute("data-source-line")) targets.push(child);
  }
  return targets.sort(
    (first, second) =>
      Number(first.dataset.sourceLine) - Number(second.dataset.sourceLine),
  );
}

function highlightRange(startBlock, endBlock) {
  const from = Number(startBlock.dataset.sourceLine);
  const to = Number(endBlock.dataset.sourceLine);
  const minLine = Math.min(from, to);
  const maxLine = Math.max(from, to);
  for (const block of anchorBlocks) {
    const line = Number(block.dataset.sourceLine);
    block.classList.toggle(
      "range-selecting",
      line >= minLine && line <= maxLine,
    );
  }
}

function clearRangeHighlight() {
  for (const block of anchorBlocks) block.classList.remove("range-selecting");
}

function beginBlockDrag(startBlock, event) {
  event.preventDefault();
  let endBlock = startBlock;
  highlightRange(startBlock, endBlock);

  const onMove = (moveEvent) => {
    const over = nearestAnchor(
      document.elementFromPoint(moveEvent.clientX, moveEvent.clientY),
    );
    if (over && anchorBlocks.includes(over)) {
      endBlock = over;
      highlightRange(startBlock, endBlock);
    }
  };
  const finish = (commit) => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("blur", onCancel);
    clearRangeHighlight();
    if (commit) openComposer(rangeAnchor(startBlock, endBlock));
  };
  const onUp = () => finish(true);
  const onCancel = () => finish(false);
  const onKey = (keyEvent) => {
    if (keyEvent.key === "Escape") finish(false);
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
  document.addEventListener("keydown", onKey);
  window.addEventListener("blur", onCancel);
}

function decorateAnchors() {
  const viewer = document.getElementById("viewer");
  anchorBlocks = anchorTargets(viewer);
  for (const block of anchorBlocks) {
    const addButton = getElement("button", {
      class: "line-add",
      type: "button",
      text: "+",
    });
    addButton.setAttribute(
      "aria-label",
      "Comment on this block; drag to span lines",
    );
    addButton.addEventListener("mousedown", (event) =>
      beginBlockDrag(block, event),
    );
    block.prepend(addButton);
  }
}

function scrollToAnchor(anchor) {
  if (!anchor) return;
  const block = anchorBlocks.find(
    (candidate) => Number(candidate.dataset.sourceLine) === anchor.startLine,
  );
  block?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function markAnchored() {
  for (const block of anchorBlocks) block.removeAttribute("data-has-comment");
  for (const comment of store.comments.values()) {
    if (!comment.anchor) continue;
    const { startLine, endLine } = comment.anchor;
    for (const block of anchorBlocks) {
      const line = Number(block.dataset.sourceLine);
      if (line >= startLine && line <= endLine) {
        block.setAttribute("data-has-comment", "true");
      }
    }
  }
}

function hidePopover() {
  popover?.remove();
  popover = null;
}

function showPopover(rectangle, anchor, sourceText) {
  hidePopover();
  popover = getElement("div", { class: "sel-popover" });
  const buttonElement = getElement("button", {
    type: "button",
    text: "Comment",
  });
  buttonElement.addEventListener("mousedown", (event) => {
    event.preventDefault();
    hidePopover();
    openComposer({ ...anchor, sourceText: sourceText || anchor.sourceText });
  });
  popover.append(buttonElement);
  popover.style.left = `${rectangle.left + rectangle.width / 2 + window.scrollX}px`;
  popover.style.top = `${rectangle.top + window.scrollY - POPOVER_OFFSET_PX}px`;
  document.body.append(popover);
}

function wireSelection() {
  document.addEventListener("mouseup", () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      hidePopover();
      return;
    }
    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    const startBlock = nearestAnchor(range.startContainer);
    const endBlock = nearestAnchor(range.endContainer) || startBlock;
    if (!text || !startBlock) {
      hidePopover();
      return;
    }
    showPopover(
      range.getBoundingClientRect(),
      rangeAnchor(startBlock, endBlock),
      text,
    );
  });
  document.addEventListener("scroll", hidePopover, { passive: true });
}

/* ── Submission ───────────────────────────────────────── */
function showOverlay(title, text) {
  const titleEl = document.getElementById("overlay-title");
  const textEl = document.getElementById("overlay-text");
  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = text;
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.hidden = false;
}

// In-page confirm modal (replaces window.confirm so the dialog matches the
// viewer chrome). Resolves true on "Close anyway", false on Cancel/Escape.
function confirmClose(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirm-overlay");
    const ok = document.getElementById("confirm-ok");
    const cancel = document.getElementById("confirm-cancel");
    if (!overlay || !ok || !cancel) {
      resolve(true);
      return;
    }
    const text = document.getElementById("confirm-text");
    if (text) text.textContent = message;
    overlay.hidden = false;
    cancel.focus();
    const settle = (result) => {
      overlay.hidden = true;
      ok.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };
    const onOk = () => settle(true);
    const onCancel = () => settle(false);
    const onKey = (event) => {
      if (event.key === "Escape") settle(false);
    };
    ok.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
    document.addEventListener("keydown", onKey);
  });
}

function setActionsDisabled(disabled) {
  for (const id of ["submit-revise", "submit-discuss", "close-viewer"]) {
    const element = document.getElementById(id);
    if (element) element.disabled = disabled;
  }
}

function finalizeSubmitted() {
  submitted = true;
  for (const attachment of allAttachments())
    URL.revokeObjectURL(attachment.url);
}

// Revise / discuss: send the comments with the chosen disposition, then lock the
// page behind the "return to Claude" overlay. A failed POST re-enables the bar.
async function submitWithIntent(intent, title, text) {
  if (submitted) return;
  setActionsDisabled(true);
  const ok = await submitFeedback(
    view,
    (status) => buildPayload(status, intent),
    allAttachments(),
  );
  if (!ok) {
    updateStatus();
    return;
  }
  finalizeSubmitted();
  const note = document.getElementById("submit-note");
  if (note) note.hidden = false;
  showOverlay(title, text);
}

// Dismiss: best-effort signal that the viewer was closed with no changes so a
// waiting collect_feedback resolves cleanly. Proceeds even if the POST fails —
// the session is already gone in that case and the tab just needs closing.
async function dismissViewer() {
  if (submitted) return;
  const drafts = store.comments.size + store.overall.size;
  if (drafts) {
    const proceed = await confirmClose(
      `You have ${drafts} unsent comment${drafts === 1 ? "" : "s"}. Close the viewer anyway?`,
    );
    if (!proceed) return;
  }
  setActionsDisabled(true);
  finalizeSubmitted();
  await submitFeedback(
    view,
    (status) => ({
      session_id: view.session_id,
      status,
      intent: "dismiss",
      overall: [],
      comments: [],
    }),
    [],
  );
  showOverlay("Viewer closed", "You can close this tab now.");
  window.setTimeout(() => {
    try {
      window.close();
    } catch {
      /* OS-opened tabs can't be closed by script — the overlay says so */
    }
  }, 400);
}

/* ── Public ───────────────────────────────────────────── */
export function setConnectionState(state) {
  connectionState = state;
  updateStatus();
}

export function initComments(viewState) {
  view = viewState || {};
  decorateAnchors();
  wireSelection();
  document
    .getElementById("add-overall")
    ?.addEventListener("click", () => openOverallComposer());
  document
    .getElementById("submit-revise")
    ?.addEventListener("click", () =>
      submitWithIntent(
        "revise",
        "Sent for revision",
        "Claude will apply your comments and reopen the updated document.",
      ),
    );
  document
    .getElementById("submit-discuss")
    ?.addEventListener("click", () =>
      submitWithIntent(
        "discuss",
        store.comments.size + store.overall.size
          ? "Sent to chat"
          : "Continuing",
        "Return to your Claude conversation to continue.",
      ),
    );
  document
    .getElementById("close-viewer")
    ?.addEventListener("click", dismissViewer);
  document.getElementById("overlay-confirm")?.addEventListener("click", () => {
    const overlay = document.getElementById("overlay");
    if (overlay) overlay.hidden = true;
  });
  renderSidebar();
}
