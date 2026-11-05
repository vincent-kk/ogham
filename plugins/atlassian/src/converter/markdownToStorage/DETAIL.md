# markdownToStorage — Contract

## Requirements

- 코드 블록은 `ac:structured-macro`, 이미지는 `ac:image` 태그로 출력한다 — Confluence 가 이해하는 매크로 형태여야 저장 후 렌더된다.
- XML 특수문자(`&`, `<`, `>`, `"`)는 항상 이스케이프한다 — 생략하거나 우회하는 경로를 두지 않는다.
- 블록·인라인 파싱은 공용 organ(`../markdownParsing/`)을 쓴다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-xml-escaping — XML 이스케이프

- 인라인 텍스트의 XML 특수문자가 이스케이프되어 산출물이 유효한 XHTML 로 남는다.

## Last Updated

Confluence 매크로 호환성과 XML 이스케이프 정책이 바뀔 때 갱신한다.
