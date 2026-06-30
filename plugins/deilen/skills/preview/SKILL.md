---
name: preview
description: '[deilen] Preview a markdown document (or plan) as a readable browser page; if the user leaves line-anchored comments, collect them back into the conversation. Trigger: "preview this", "show this in the browser", "open this as a page", "이 문서 페이지로 보여줘"'
user_invocable: true
argument-hint: ""
---

# preview

Preview the document Claude just produced as a readable local page. The user can
read it and close, or leave line-anchored comments (and any attached images) —
when they do, collect the feedback and act on it: revise the document or continue
the conversation, whichever they chose.

## Steps

1. **Pick the source.** Use the most recent document/plan in the conversation, or
   the file the user points at.
   - In the conversation → pass it as `content`.
   - A file on disk → pass its path as `path`.
   - **Large documents → prefer `path`.** Inlining `content` duplicates the whole
     body into tool input; if it is long, write it to a file first and pass
     `path` instead.
   - Do **not** re-print the full document in chat before rendering it — that
     doubles token cost.

2. **Render.** Call `mcp__plugin_deilen_tools__render_viewer` with `{ content | path, title? }`
   (exactly one of `content`/`path`). It returns `{ session_id, url, status }`
   immediately. Give the user the `url` (the page also opens automatically) and
   tell them to select text or use a block's **+** to leave comments, paste or
   drop image screenshots, then choose **Revise & reopen** (apply the comments
   and re-render the updated page), **Continue in chat** (talk the comments
   through — works even with none), or **Close** (just dismiss the viewer).

3. **Collect (poll loop).** Call `mcp__plugin_deilen_tools__collect_feedback` with
   `{ session_id, wait_seconds }`:
   - `status: "complete"` → stop the loop; you now have the feedback.
   - `status: "pending"` → call it again immediately (this is the normal
     waiting path). Use a generous `wait_seconds` (e.g. 45) so it usually
     resolves in one or two rounds.
   - After about 5 pending rounds, stop polling and tell the user to let you
     know when they have submitted, then wait for their message.

4. **Act on the intent.** The collected feedback opens with a directive that
   reflects the button the user pressed:
   - **Revise** → apply the comments to the document (each names a source-line
     range like `L12-14` and an excerpt — edit surgically at that spot), then
     re-render the result: call `mcp__plugin_deilen_tools__render_viewer` again and resume the
     collect loop. This is an iterative revise loop — repeat until the user
     continues in chat or closes the viewer.
   - **Discuss** → answer or discuss the comments in the conversation; don't
     silently rewrite the document unless the user asks.
   - **Dismiss / no comments** → the user ended the review without changes;
     acknowledge briefly and continue, or wait for their next message.

   Attached images arrive as image blocks; read them as visual context. Honor
   `[resolved]` markers as lower priority.

5. **Clean up (optional).** A submitted review already closes its session; only
   call `mcp__plugin_deilen_tools__close_viewer` with `{ session_id }` if you stopped polling
   before the user ever submitted.

## Notes

- Plans are markdown too — render them with `mcp__plugin_deilen_tools__render_viewer` directly. In plan
  mode, preview after the plan is confirmed (or render a saved plan file), since
  plan mode can restrict tool use.
- Local images (analysis plots, screenshots) display when referenced by an
  absolute `file://` URI — `![plot](file:///abs/path.png)`; `http(s)` and `data:`
  URIs also render, but a bare local path (`/abs/...`) will not load. Use the
  absolute path you already know for the file.
- Reply to the user in their own language.

## Do not

- Block indefinitely on a single call — one `mcp__plugin_deilen_tools__collect_feedback` is bounded; the
  loop provides the waiting.
- Re-print the full document body in chat just to render it.
- Mention or expose the `token` query parameter — it is opaque to the user.
