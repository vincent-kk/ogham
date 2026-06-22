# @ogham/deilen

Render Claude-generated markdown documents as a readable browser page, and send line-anchored feedback back to Claude.

## What it does

When Claude produces a long markdown document, `deilen` serves it as a clean local web page (127.0.0.1) instead of a wall of text in the terminal:

- **Readable rendering** — tables, code highlighting, Mermaid diagrams, and math, with heavy renderers lazy-loaded so unused ones never cost memory.
- **Line-anchored feedback** — select any line, attach a comment and images (including pasted clipboard screenshots), and submit. The feedback returns to Claude automatically.
- **Source copy** — copy the original markdown (whole document, a section, or a single code block).

## How it works

A local MCP server (`tools`) renders the document, opens it in your browser, and waits (bounded long-poll) for your feedback. Your comments and images come back to Claude as structured text plus image blocks it can actually see.

## Usage

```
# Show the current document as a page and collect feedback
/deilen:present

# Open the local settings UI (theme, auto-open, timeouts, renderers)
/deilen:setup
```

## Documentation

Design specification lives in [`.metadata/deilen/`](../../.metadata/deilen/). Korean: [README-ko_kr.md](./README-ko_kr.md).
