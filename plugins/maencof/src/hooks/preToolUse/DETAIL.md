# preToolUse — Contract

## Requirements

- 한 번의 물리 PreToolUse 호출은 순서를 보존한 하나 이상의 논리 도구 호출로 판정한다. 첫 allow 뒤의 operation 도 생략하지 않는다.
- `Write`·`Edit`·`Delete` 는 mutation별 host target을 판정하는 layerGuard 로, `Read`·`Grep`·`Glob` 은 vaultRedirector 로 라우팅한다.
- 모든 guard 결과는 deny-wins 로 병합한다. 하나라도 `continue: false` 면 전체 물리 호출을 deny 하고 해당 사유를 보존한다.
- lifecycleDispatcher 는 논리 operation 수와 무관하게 정확히 한 번 실행하며 성공·실패 모두 `original` 물리 입력의 `tool_name`을 matcher 입력으로 사용한다. dispatcher가 physical `apply_patch`를 logical `Edit`으로 해석한다.
- 정규화에 실패하면 원래 cwd 의 실제 maencof vault marker 를 기준으로 vault 안에서는 파싱 사유와 함께 deny 하고, vault 밖에서는 pass 한다.
- concern 차단은 최종 출력에서 PreToolUse permission deny envelope 로 번역한다. top-level `continue: false` 를 직접 출력하지 않는다.

## API Contracts

단일 호출 진입점은 batch 계약으로 위임하는 호환 경계다. 정규화 실패에도 원래 물리 입력의 lifecycle 실행을 보존하고, 최종 차단 표현은 deny envelope 번역기에 맡긴다.

## Acceptance Criteria

행동별 결과와 경계값은 이 모듈을 검증하는 테스트가 고정한다.

## Last Updated

논리 호출의 deny-wins 병합, 정규화 실패 처리 또는 물리 입력의 lifecycle 실행 보장이 바뀔 때 갱신한다.
