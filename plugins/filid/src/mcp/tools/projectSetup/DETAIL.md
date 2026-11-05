# project_setup — Filid 1.0 Contract

## Requirements

- `init`, `rules-status`, `rules-manifest`, `rules-sync`, `settings` action만 허용한다.
- action별 기존 도구의 summary, data, diagnostics와 status 의미를 보존한다.
- rules action은 project path를 요구하고, init과 settings는 생략 시 enclosing repository root를 사용한다.
- project source는 수정하지 않으며 config와 managed rule 문서는 각 child 계약이 허용한 범위에서만 쓴다.
- plugin root를 못 찾은 rule-doc 진단(`rule-docs-plugin-root-unresolved`)은 `nextAction`을 싣는다.
- `rules-sync`의 `selections`·`resync` 입력이 `Record<string, boolean>`이나 `string[]`(또는 그 JSON 문자열)로 정규화되지 않으면 각각 `setup-selection-invalid`, `setup-resync-invalid` 코드의 `ToolDiagnosticError`를 던지며, `nextAction`은 그 입력이 받아들이는 형태를 그대로 말한다.

## API Contracts

- `rules-sync` 부분 적용은 `violations` 상태와 부분 문서 수를 보고하고 상세 파일 결과를 data에 보존한다.

- 각 action은 기존 child 결과의 의미를 보존한다. settings에는 host abort signal을 전달해 종료된 호출의 대기가 남지 않게 한다.

## Acceptance Criteria

구체적인 동작과 경계값은 이 모듈의 테스트가 고정하므로 별도 수락 그룹을 중복 선언하지 않는다.

## Last Updated

action별 경로 기본값, config·규칙 쓰기 범위나 잘못된 입력의 복구 안내가 바뀔 때 갱신한다.
