# Revise loop (the Revise directive only)

Load this only when the collected feedback's directive is **Revise**. The
Discuss and Dismiss terminations never need it — they end in chat without
re-rendering.

Apply the comments, then re-render, and keep iterating:

1. **Edit surgically.** Each comment names a source-line range like `L12-14` and
   an excerpt — edit at exactly that spot. Do not reword or restructure beyond
   what the comment asks.
2. **Re-render.** Call `mcp__plugin_deilen_tools__render_viewer` again on the
   updated document, then collect again (Step 3 of the skill).
3. **Iterate.** This is an iterative revise loop — repeat 1–2 until the user
   continues in chat or closes the viewer.

**Large-document optimization.** When revising a large document over many rounds,
write it to a file once and re-render by `path` thereafter, editing in place —
each round then re-sends only the diff, not the whole body.
