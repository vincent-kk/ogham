---
name: preview
description: '[deilen] Preview a markdown document (or plan) as a readable browser page; if the user leaves line-anchored comments, collect them back into the conversation. Trigger: "preview this", "show this in the browser", "open this as a page", "이 문서 페이지로 보여줘"'
user_invocable: true
argument-hint: ""
---

# preview

Preview the document Claude just produced as a readable local page. The user reads
it and closes, or leaves line-anchored comments (and images) — then collect the
feedback and act: revise the document or continue the conversation.

## Steps

1. **Pick the source.** Default to the most recent document/plan and pass it as
   `content` — the server stores and serves the body, so no temp file is needed.
   When the body is already a file on disk, pass its `path` instead, so only the
   path enters tool input. Two exceptions: to preview edits you only _proposed_ in
   chat, pass them as `content` (a `path` renders the stale on-disk version); if
   the body is split across messages, merge the pieces in order and repair
   formatting just enough for valid markdown — never reword or restructure, since
   preview must show what will be saved verbatim.

2. **Render.** Call `mcp__plugin_deilen_tools__render_viewer` with `{ content | path, title? }`
   (exactly one of `content`/`path`). It returns `{ session_id, url, status }`
   immediately. Give the user the `url` (the page also opens automatically) and
   tell them to select text or use a block's **+** to leave comments, paste or
   drop image screenshots, then choose **Revise & reopen**, **Continue in chat**
   (works even with no comments), or **Close**.

3. **Collect.** Call `mcp__plugin_deilen_tools__collect_feedback` with
   `{ session_id }` — omit `wait_seconds` so the configured default applies. The
   single call covers the whole review: it blocks until the user submits, then
   returns their feedback. `status: "pending"` means the wait elapsed with no
   submission — don't call again; tell the user to say the word once they have
   submitted, then wait for their message (their submission is held for you).

4. **Act on the intent.** The feedback opens with a directive naming the button
   the user pressed:
   - **Revise** → apply the comments and re-render, iterating until the user
     continues in chat or closes. Mechanics:
     **[references/revise-loop.md](references/revise-loop.md)**.
   - **Discuss** → answer or discuss the comments in the conversation; don't
     silently rewrite the document unless the user asks.
   - **Dismiss / no comments** → acknowledge briefly and continue.

   Attached images arrive as image blocks; read them as visual context. Honor
   `[resolved]` markers as lower priority.

5. **Clean up (optional).** A submitted review already closes its session; only
   call `mcp__plugin_deilen_tools__close_viewer` with `{ session_id }` if you
   stopped polling before the user submitted.

## Notes

- Plans are markdown too — render them directly. In plan mode, preview after the
  plan is confirmed (or render a saved plan file), since plan mode can restrict
  tool use.
- Local images (analysis plots, screenshots) load only from an absolute `file://`
  URI — `![plot](file:///abs/path.png)`; `http(s)`/`data:` also work, but a bare
  local path will not. The failure is silent (render returns before the browser
  fetches the image), so use the `file://` form up front.
- A very large body hits the `max_viewer_mb` cap (default 5 MB, applied to both
  `content` and `path`); render returns a self-describing error — relay it, and
  note that switching to `path` does not dodge the cap.
- Reply to the user in their own language.

## Do not

- Poll in a loop, or pass a short `wait_seconds` to force one — a single
  `mcp__plugin_deilen_tools__collect_feedback` is bounded and already waits out
  the whole review.
- Re-print the full document body in chat just to render it.
- Mention or expose the `token` query parameter — it is opaque to the user.
