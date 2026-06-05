## Purpose

Pure local format conversion: ADF/Storage Format <-> Markdown. Zero dependency on auth/config/HTTP.

## Structure

| File | Role |
|---|---|
| `adfToMarkdown/` | ADF JSON → Markdown (port from Python adf.py) |
| `markdownToAdf/` | Markdown → ADF JSON (port from Python adf.py) |
| `storageToMarkdown/` | Confluence Storage XHTML → Markdown |
| `markdownToStorage/` | Markdown → Confluence Storage XHTML |
| `markdownToWiki/` | Markdown → Jira Wiki Markup (Server/DC v2) |

## Conventions

- 각 변환 방향은 독립 파일로 분리 (`adfToMarkdown.ts` 등)
- 순수 함수만 허용 — 부수 효과 없음
- Python `adf.py` 레퍼런스 구현을 기준으로 포팅

## Dependencies

- 외부 라이브러리 없음 (zero external deps)
- Node.js 내장 모듈만 허용

## Boundaries

### Always do

- Support all 17 ADF node types from the Python reference
- Preserve round-trip fidelity for common constructs

### Ask first

- Add new format support

### Never do

- Import from core/ or mcp/ (converter is a pure sibling module)
- Make HTTP calls or use auth
