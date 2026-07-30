# markdownToStorage — Contract

## Requirements

- Markdown 을 Confluence Storage Format XHTML 로 바꾸는 순수 함수 모듈이다.
- 코드 블록은 `ac:structured-macro`, 이미지는 `ac:image` 태그로 출력한다 — Confluence 가 이해하는 매크로 형태여야 저장 후 렌더된다.
- XML 특수문자(`&`, `<`, `>`, `"`)는 항상 이스케이프한다 — 생략하거나 우회하는 경로를 두지 않는다.
- 코드 블록은 `ac:structured-macro` 와 `CDATA` 래퍼로 감싼다.
- 블록·인라인 파싱은 공용 organ(`../markdownParsing/`)을 쓴다.

## API Contracts

- `markdownToStorage(markdown: string): string`
- `operations/renderBlocks` — 블록 → Storage Format XML 문자열(organ).
- `operations/renderInline` — 인라인 토큰 → XML 이스케이프된 Storage Format 태그(organ).

## Acceptance Criteria

### AC-storage-macros — 매크로 출력

- 코드 블록이 `ac:structured-macro` 로, 이미지가 `ac:image` 로 출력된다.

### AC-xml-escaping — XML 이스케이프

- 인라인 텍스트의 XML 특수문자가 이스케이프되어 산출물이 유효한 XHTML 로 남는다.

## Last Updated

2026-07-30 — Markdown → Storage Format 변환 계약을 문서화했다.
