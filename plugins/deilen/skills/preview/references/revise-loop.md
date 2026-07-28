# Revise loop (the Revise directive only)

Load this only when the collected feedback's directive is **Revise**. The Discuss and Dismiss terminations never need it — they end in chat without re-rendering.

Apply the comments, then re-render, and keep iterating:

1. **Edit surgically.** Each comment names a source-line range like `L12-14` and an excerpt — edit at exactly that spot. Do not reword or restructure beyond what the comment asks.
2. **Answer structure with structure.** When a comment asks for clarification and the subject is a flow, a sequence, a hierarchy, or a state machine, add the diagram rather than another paragraph ([visuals.md](visuals.md)) — still confined to the commented span.
3. **Re-parse, then re-render.** If any edit touched a mermaid fence, run the preview skill's Mermaid parse gate again (Step 3), then call `mcp__plugin_deilen_tools__render_viewer` on the updated document and collect again (Step 5 of the skill).
4. **Iterate.** This is an iterative revise loop — repeat 1–3 until the user continues in chat or closes the viewer.

**Large-document optimization.** When revising a large document over many rounds, write it to a file once and re-render by `path` thereafter, editing in place — each round then re-sends only the diff, not the whole body.
