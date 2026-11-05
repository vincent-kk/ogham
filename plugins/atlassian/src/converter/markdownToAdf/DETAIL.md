# markdownToAdf — Contract

## Requirements

- 블록·인라인 파싱은 공용 organ(`../markdownParsing/`)을 쓴다 — 파서를 여기서 다시 만들지 않는다.
- 출력은 항상 유효한 ADF `doc` 구조다. 빈 입력은 빈 paragraph 를 담은 유효한 `doc` 을 낸다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

구체적인 입출력 수락 기준은 해당 모듈 테스트가 고정한다.

## Last Updated

ADF 문서 유효성 또는 공용 파서 위임 계약이 바뀔 때 갱신한다.
