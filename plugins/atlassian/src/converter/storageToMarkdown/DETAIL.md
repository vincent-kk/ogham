# storageToMarkdown — Contract

## Requirements

- Confluence Storage Format XHTML 을 Markdown 으로 바꾸는 순수 함수 모듈이다. 외부 파서를 쓰지 않고 자체 재귀 하강 파서를 갖는다.
- **파싱 실패는 예외가 아니다.** 태그 제거 폴백(`stripTagsFallback`)으로 안전하게 복원한다 — 문서 하나의 깨진 마크업이 조회 전체를 실패시키지 않는다.
- 파서는 CDATA·주석·void 요소를 처리한다.
- 표는 GFM 파이프 테이블로 렌더한다.
- `ac:structured-macro` 는 blockquote 형태로 표현한다.
- 연속 3개 이상 개행은 2개로 정규화한다.

## API Contracts

- `storageToMarkdown(xhtml: string): string` — 파싱 → 렌더링 → 공백 정규화, 실패 시 폴백.
- `operations/parseHtml` — 재귀 하강 HTML/XHTML 파서(organ).
- `operations/htmlNode` — `HtmlElement`·`HtmlNode` 타입(organ).
- `operations/renderStorageNode` — 노드 → Markdown 재귀 변환(organ).
- `operations/renderStorageTable` — table/thead/tbody/tr/td/th → GFM 표(organ).
- `operations/stripTagsFallback` — 폴백 텍스트 추출(organ).

## Acceptance Criteria

### AC-parser-robustness — 파서 내성

- CDATA·주석·void 요소가 포함된 입력이 정상 파싱된다.
- 파싱 실패 시 예외 대신 태그 제거 폴백 결과가 반환된다.

### AC-table-rendering — 표 변환

- Storage 표가 GFM 파이프 테이블로 렌더된다.

## Last Updated

2026-07-30 — Storage Format → Markdown 변환과 폴백 계약을 문서화했다.
