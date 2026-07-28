# CLAUDE.md — @ogham/deilen

현재 계약은 [INTENT.md](./INTENT.md), 소스 경계는 [src/INTENT.md](./src/INTENT.md), 동작 명세는 [`.metadata/deilen/README.md`](../../.metadata/deilen/README.md)를 따른다.

## Authorship boundary

- AI 작업 범위는 `src/`, `scripts/`, `skills/`, 문서다. `bridge/`와 `public/`은 사용자가 빌드하고 커밋하는 산출물이므로 명시적 요청 없이 생성하거나 수정하지 않는다.
- Mermaid·highlight.js·KaTeX는 브라우저가 지연 적재하는 자산이다. MCP 서버 번들로 옮기지 않는다.
