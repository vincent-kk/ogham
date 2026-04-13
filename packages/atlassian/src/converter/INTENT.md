## Purpose

Pure local format conversion: ADF/Storage Format <-> Markdown. Zero dependency on auth/config/HTTP.

## Structure

| File | Role |
|---|---|
| `adf-to-markdown.ts` | ADF JSON → Markdown (port from Python adf.py) |
| `markdown-to-adf.ts` | Markdown → ADF JSON (port from Python adf.py) |
| `storage-to-markdown.ts` | Confluence Storage XHTML → Markdown |
| `markdown-to-storage.ts` | Markdown → Confluence Storage XHTML |

## Boundaries

### Always do

- Support all 17 ADF node types from the Python reference
- Preserve round-trip fidelity for common constructs

### Ask first

- Add new format support (wiki markup is post-MVP)

### Never do

- Import from core/ or mcp/ (converter is a pure sibling module)
- Make HTTP calls or use auth
