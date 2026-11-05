# storageToMarkdown — Contract

## Requirements

- Confluence Storage Format XHTML 을 Markdown 으로 바꾸는 순수 함수 모듈이다. 외부 파서를 쓰지 않고 자체 재귀 하강 파서를 갖는다.
- **파싱 실패는 예외가 아니다.** 태그 제거 폴백(`stripTagsFallback`)으로 안전하게 복원한다 — 문서 하나의 깨진 마크업이 조회 전체를 실패시키지 않는다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-parser-robustness — 파서 내성

- CDATA·주석·void 요소가 포함된 입력이 정상 파싱된다.
- 파싱 실패 시 예외 대신 태그 제거 폴백 결과가 반환된다.

## Last Updated

XHTML 파싱 실패 폴백과 변환 호환 범위가 바뀔 때 갱신한다.
