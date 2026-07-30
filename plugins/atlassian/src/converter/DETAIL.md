# converter — Contract

## Requirements

- 순수 로컬 변환만 한다. 인증·설정·HTTP 에 의존하지 않으며, 네트워크를 만지는 코드가 이 계층에 없다.
- 이 트리는 Python `mcp-atlassian` 에서 포팅한 호환 계층이다. 레퍼런스의 ADF 노드 타입 17종을 모두 지원하며, 노드 매핑을 바꿀 때는 원본 의미와 왕복 변환 계약을 함께 검토한다.
- 외부 라이브러리를 쓰지 않는다 — Node 내장 모듈만으로 동작한다.
- 알 수 없는 노드 타입은 실패시키지 않고 자식 콘텐츠로 폴백한다 — 변환기가 문서 하나 때문에 전체를 버리지 않는다.
- 각 방향은 독립 fractal 이고, 공용 파서(`markdownParsing/`)와 타입(`types/`)은 organ 이다.

## API Contracts

- `convert(...)` — 입력·출력 포맷 쌍을 받아 해당 변환기에 위임하는 진입 함수(소유: `operations/`).
- `adfToMarkdown` · `markdownToAdf` — ADF JSON ↔ Markdown.
- `storageToMarkdown` · `markdownToStorage` — Confluence Storage XHTML ↔ Markdown.
- `markdownToWiki` — Markdown → Jira Wiki Markup(Server/DC v2 본문 포맷).

## Acceptance Criteria

### AC-converter-purity — 순수성

- converter 하위에 HTTP·설정·자격증명 참조가 0건이다.
- 같은 입력이 항상 같은 출력을 낸다.

### AC-unknown-node-fallback — 미지 노드 폴백

- 알 수 없는 노드 타입이 예외 대신 자식 콘텐츠로 처리된다.

### AC-roundtrip — 왕복 보존

- Markdown → ADF → Markdown 왕복에서 표·목록·인라인 마크가 보존된다.

## Last Updated

2026-07-30 — 변환 계층의 순수성 계약을 문서화했다.
