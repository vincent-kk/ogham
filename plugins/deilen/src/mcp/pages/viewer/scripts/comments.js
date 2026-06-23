// Line-anchored commenting + multiple overall notes: a block's gutter "+" or a
// text selection opens a comment composer; the "Overall note" button opens a
// separate overall composer. Both live in in-memory stores, render as sidebar
// cards, and debounce-save as text-only drafts until the final multipart submit.

import { wireImageCapture } from "./images.js";
import { scheduleAutoSave, submitFeedback } from "./submit.js";

const POPOVER_OFFSET_PX = 8;

let view = {};
const store = { comments: new Map(), overall: new Map() };
let sequence = 0;
let overallSequence = 0;
let popover = null;

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

function blockAnchor(block) {
  const startLine = Number(block.dataset.sourceLine);
  const endLine = Number(block.dataset.sourceEnd || block.dataset.sourceLine);
  return { startLine, endLine, sourceText: rawSlice(startLine, endLine) };
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
  scheduleAutoSave(view, buildPayload);
}

function buildPayload(status) {
  return {
    session_id: view.session_id,
    status,
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
  closeComposer();
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

function closeComposer() {
  document.querySelector('#comment-list [data-composer="true"]')?.remove();
}

/* ── Overall composer (text-only, no anchor) ──────────── */
function openOverallComposer(editing) {
  const list = document.getElementById("comment-list");
  closeComposer();

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
  if (status) {
    const parts = [];
    if (count) parts.push(`${count} comment${count === 1 ? "" : "s"}`);
    if (overallCount) {
      parts.push(
        `${overallCount} overall note${overallCount === 1 ? "" : "s"}`,
      );
    }
    status.textContent = parts.length ? parts.join(" · ") : "No comments yet";
  }
  const submit = document.getElementById("submit-feedback");
  if (submit) submit.disabled = count === 0 && overallCount === 0;
}

/* ── Anchors + selection ──────────────────────────────── */
function anchorTargets(viewer) {
  const targets = [...viewer.querySelectorAll("li[data-source-line]")];
  for (const child of viewer.children) {
    if (child.tagName === "UL" || child.tagName === "OL") continue;
    if (child.hasAttribute("data-source-line")) targets.push(child);
  }
  return targets;
}

function decorateAnchors() {
  const viewer = document.getElementById("viewer");
  for (const block of anchorTargets(viewer)) {
    const addButton = getElement("button", {
      class: "line-add",
      type: "button",
      text: "+",
    });
    addButton.setAttribute("aria-label", "Comment on this block");
    addButton.addEventListener("click", () => openComposer(blockAnchor(block)));
    block.prepend(addButton);
  }
}

function scrollToAnchor(anchor) {
  if (!anchor) return;
  const block = document.querySelector(
    `#viewer [data-source-line="${anchor.startLine}"]`,
  );
  block?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function markAnchored() {
  document
    .querySelectorAll("#viewer [data-has-comment]")
    .forEach((node) => node.removeAttribute("data-has-comment"));
  for (const comment of store.comments.values()) {
    if (!comment.anchor) continue;
    const block = document.querySelector(
      `#viewer [data-source-line="${comment.anchor.startLine}"]`,
    );
    block?.setAttribute("data-has-comment", "true");
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

/* ── Public ───────────────────────────────────────────── */
export function initComments(viewState) {
  view = viewState || {};
  decorateAnchors();
  wireSelection();
  document
    .getElementById("add-overall")
    ?.addEventListener("click", () => openOverallComposer());
  document
    .getElementById("submit-feedback")
    ?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      const succeeded = await submitFeedback(
        view,
        buildPayload,
        allAttachments(),
      );
      if (succeeded) {
        const note = document.getElementById("submit-note");
        if (note) note.hidden = false;
        const overlay = document.getElementById("overlay");
        if (overlay) overlay.hidden = false;
      } else {
        button.disabled = false;
      }
    });
  document.getElementById("overlay-confirm")?.addEventListener("click", () => {
    const overlay = document.getElementById("overlay");
    if (overlay) overlay.hidden = true;
  });
  renderSidebar();
}
