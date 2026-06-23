// Line-anchored commenting + multiple overall notes: a block's gutter "+" or a
// text selection opens a comment composer; the "Overall note" button opens a
// separate overall composer. Both live in in-memory stores, render as sidebar
// cards, and debounce-save as text-only drafts until the final multipart submit.

import { toAttachment, wireImageCapture } from "./images.js";
import { scheduleAutoSave, submitFeedback } from "./submit.js";

let view = {};
const store = { comments: new Map(), overall: new Map() };
let seq = 0;
let overallSeq = 0;
let popover = null;

function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.text != null) node.textContent = opts.text;
  if (opts.type) node.type = opts.type;
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  }
  return node;
}

function rawSlice(startLine, endLine) {
  const lines = (view.raw || "").split("\n");
  return lines
    .slice(startLine - 1, endLine)
    .join("\n")
    .trim();
}

function blockAnchor(block) {
  const startLine = Number(block.dataset.sourceLine);
  const endLine = Number(block.dataset.sourceEnd || block.dataset.sourceLine);
  return { startLine, endLine, sourceText: rawSlice(startLine, endLine) };
}

function nearestAnchor(node) {
  let cur = node instanceof Element ? node : node?.parentElement;
  while (cur && cur.id !== "viewer") {
    if (cur.hasAttribute?.("data-source-line")) return cur;
    cur = cur.parentElement;
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
    overall: [...store.overall.values()].map((n) => ({
      id: n.id,
      text: n.text,
    })),
    comments: [...store.comments.values()].map((c) => ({
      id: c.id,
      anchor: c.anchor,
      text: c.text,
      imageIds: c.attachments.map((a) => a.id),
      resolved: c.resolved || undefined,
    })),
  };
}

function allAttachments() {
  const out = [];
  for (const c of store.comments.values()) out.push(...c.attachments);
  return out;
}

/* ── Comment composer ─────────────────────────────────── */
function openComposer(anchor, editing) {
  const list = document.getElementById("comment-list");
  closeComposer();
  const attachments = editing ? [...editing.attachments] : [];

  const card = el("div", { class: "composer" });
  card.dataset.composer = "true";

  const chip = el("div", {
    class: anchor ? "anchor-chip" : "anchor-chip overall",
    text: anchor ? `L${anchor.startLine}-${anchor.endLine}` : "general",
  });
  const textarea = el("textarea", {
    attrs: { placeholder: "Leave a comment…" },
  });
  textarea.value = editing ? editing.text : "";
  const thumbs = el("div", { class: "thumbs" });

  function renderThumbs() {
    thumbs.replaceChildren();
    attachments.forEach((att, i) => {
      const wrap = el("div", { class: "thumb" });
      const img = el("img");
      img.src = att.url;
      img.alt = att.name;
      const rm = el("button", {
        class: "thumb-remove",
        type: "button",
        text: "×",
      });
      rm.addEventListener("click", () => {
        attachments.splice(i, 1);
        renderThumbs();
      });
      wrap.append(img, rm);
      thumbs.append(wrap);
    });
  }

  const actions = el("div", { class: "composer-actions" });
  const cancel = el("button", { class: "btn", type: "button", text: "Cancel" });
  const save = el("button", {
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
      seq += 1;
      const id = `c${seq}`;
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

  wireImageCapture(card, (att) => {
    attachments.push(att);
    renderThumbs();
  });
  textarea.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save.click();
    if (e.key === "Escape") closeComposer();
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

  const card = el("div", { class: "composer" });
  card.dataset.composer = "true";

  const chip = el("div", { class: "anchor-chip overall", text: "Overall" });
  const textarea = el("textarea", {
    attrs: { placeholder: "Overall note (one topic)…" },
  });
  textarea.value = editing ? editing.text : "";

  const actions = el("div", { class: "composer-actions" });
  const cancel = el("button", { class: "btn", type: "button", text: "Cancel" });
  const save = el("button", {
    class: "btn btn-primary",
    type: "button",
    text: "Save",
  });
  cancel.addEventListener("click", closeComposer);
  save.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (!text) return;
    if (editing) {
      editing.text = text;
    } else {
      overallSeq += 1;
      const id = `o${overallSeq}`;
      store.overall.set(id, { id, text });
    }
    closeComposer();
    dispatchChange();
  });
  actions.append(cancel, save);

  textarea.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save.click();
    if (e.key === "Escape") closeComposer();
  });

  card.append(chip, textarea, actions);
  list.prepend(card);
  textarea.focus();
}

/* ── Sidebar cards ────────────────────────────────────── */
function overallNoteCard(note) {
  const card = el("div", { class: "comment-card" });
  const chip = el("div", { class: "anchor-chip overall" });
  chip.append(el("span", { text: "Overall" }));

  const body = el("div", { class: "comment-body", text: note.text });

  const actions = el("div", { class: "comment-actions" });
  const edit = el("button", {
    class: "mini-btn",
    type: "button",
    text: "Edit",
  });
  const del = el("button", {
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
  const card = el("div", {
    class: comment.resolved ? "comment-card resolved" : "comment-card",
  });
  const chip = el("div", {
    class: comment.anchor ? "anchor-chip" : "anchor-chip overall",
  });
  chip.append(
    el("span", {
      text: comment.anchor
        ? `L${comment.anchor.startLine}-${comment.anchor.endLine}`
        : "general",
    }),
  );
  if (comment.anchor?.sourceText) {
    chip.append(
      el("span", {
        class: "anchor-excerpt",
        text: comment.anchor.sourceText.split("\n")[0],
      }),
    );
  }
  chip.addEventListener("click", () => scrollToAnchor(comment.anchor));

  const body = el("div", { class: "comment-body", text: comment.text });

  const actions = el("div", { class: "comment-actions" });
  const edit = el("button", {
    class: "mini-btn",
    type: "button",
    text: "Edit",
  });
  const resolve = el("button", {
    class: "mini-btn",
    type: "button",
    text: comment.resolved ? "Unresolve" : "Resolve",
  });
  const del = el("button", {
    class: "mini-btn danger",
    type: "button",
    text: "Delete",
  });
  edit.addEventListener("click", () => openComposer(comment.anchor, comment));
  resolve.addEventListener("click", () => {
    comment.resolved = !comment.resolved;
    dispatchChange();
  });
  del.addEventListener("click", () => {
    store.comments.delete(comment.id);
    markAnchored();
    dispatchChange();
  });
  actions.append(edit, resolve, del);

  card.append(chip, body);
  if (comment.attachments.length) {
    const thumbs = el("div", { class: "thumbs" });
    for (const att of comment.attachments) {
      const wrap = el("div", { class: "thumb" });
      const img = el("img");
      img.src = att.url;
      img.alt = att.name;
      wrap.append(img);
      thumbs.append(wrap);
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

  const comments = [...store.comments.values()].sort((a, b) => {
    const al = a.anchor?.startLine ?? Number.MAX_SAFE_INTEGER;
    const bl = b.anchor?.startLine ?? Number.MAX_SAFE_INTEGER;
    return al - bl;
  });
  for (const comment of comments) list.append(commentCard(comment));

  if (!composer && overallNotes.length === 0 && comments.length === 0) {
    list.append(
      el("p", {
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
function decorateAnchors() {
  const viewer = document.getElementById("viewer");
  for (const block of viewer.children) {
    if (!block.hasAttribute("data-source-line")) continue;
    const add = el("button", { class: "line-add", type: "button", text: "+" });
    add.setAttribute("aria-label", "Comment on this block");
    add.addEventListener("click", () => openComposer(blockAnchor(block)));
    block.prepend(add);
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

function showPopover(rect, anchor, sourceText) {
  hidePopover();
  popover = el("div", { class: "sel-popover" });
  const btn = el("button", { type: "button", text: "Comment" });
  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    hidePopover();
    openComposer({ ...anchor, sourceText: sourceText || anchor.sourceText });
  });
  popover.append(btn);
  popover.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
  popover.style.top = `${rect.top + window.scrollY - 8}px`;
  document.body.append(popover);
}

function wireSelection() {
  document.addEventListener("mouseup", () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      hidePopover();
      return;
    }
    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    const block = nearestAnchor(range.commonAncestorContainer);
    if (!text || !block) {
      hidePopover();
      return;
    }
    showPopover(range.getBoundingClientRect(), blockAnchor(block), text);
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
    ?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      const ok = await submitFeedback(view, buildPayload, allAttachments());
      if (ok) {
        const note = document.getElementById("submit-note");
        if (note) note.hidden = false;
        const overlay = document.getElementById("overlay");
        if (overlay) overlay.hidden = false;
      } else {
        btn.disabled = false;
      }
    });
  document.getElementById("overlay-confirm")?.addEventListener("click", () => {
    const overlay = document.getElementById("overlay");
    if (overlay) overlay.hidden = true;
  });
  renderSidebar();
}
