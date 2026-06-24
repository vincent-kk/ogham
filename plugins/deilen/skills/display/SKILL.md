---
name: display
description: '[deilen] Render a markdown document (or plan) as a browser page and auto-collect line-anchored feedback back into the conversation. Trigger: "display this", "show this in the browser", "let me review this in a page", "이 문서 페이지로 보여줘"'
user_invocable: true
argument-hint: ""
---

# display

Render the document Claude just produced as a readable local page, then
automatically collect the user's line-anchored comments (and any attached
images) and act on them — revising the document or continuing the conversation,
whichever the user chose.

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

2. **Render.** Call `mcp_tools_render_viewer` with `{ content | path, title? }`
   (exactly one of `content`/`path`). It returns `{ session_id, url, status }`
   immediately. Give the user the `url` (the page also opens automatically) and
   tell them to select text or use a block's **+** to leave comments, paste or
   drop image screenshots, then choose **Revise & reopen** (apply the comments
   and re-display the updated page), **Continue in chat** (talk the comments
   through — works even with none), or **Close** (just dismiss the viewer).

3. **Collect (poll loop).** Call `mcp_tools_collect_feedback` with
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
     re-display the result: call `mcp_tools_render_viewer` again and resume the
     collect loop. This is an iterative review loop — repeat until the user
     continues in chat or closes the viewer.
   - **Discuss** → answer or discuss the comments in the conversation; don't
     silently rewrite the document unless the user asks.
   - **Dismiss / no comments** → the user ended the review without changes;
     acknowledge briefly and continue, or wait for their next message.

   Attached images arrive as image blocks; read them as visual context. Honor
   `[resolved]` markers as lower priority.

5. **Clean up (optional).** A submitted review already closes its session; only
   call `mcp_tools_close_viewer` with `{ session_id }` if you stopped polling
   before the user ever submitted.

## Notes

- Plans are markdown too — render them with `mcp_tools_render_viewer` directly. In plan
  mode, display after the plan is confirmed (or render a saved plan file), since
  plan mode can restrict tool use.
- Reply to the user in their own language.

## Do not

- Block indefinitely on a single call — one `mcp_tools_collect_feedback` is bounded; the
  loop provides the waiting.
- Re-print the full document body in chat just to render it.
- Mention or expose the `token` query parameter — it is opaque to the user.
