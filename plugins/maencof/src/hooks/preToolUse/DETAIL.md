# preToolUse — Contract

## Requirements

- 한 번의 물리 PreToolUse 호출은 순서를 보존한 하나 이상의 논리 도구 호출로 판정한다. 첫 allow 뒤의 operation 도 생략하지 않는다.
- `Write`·`Edit`·`Delete` 는 mutation별 host target을 판정하는 layerGuard 로, `Read`·`Grep`·`Glob` 은 vaultRedirector 로 라우팅한다.
- 모든 guard 결과는 deny-wins 로 병합한다. 하나라도 `continue: false` 면 전체 물리 호출을 deny 하고 해당 사유를 보존한다.
- lifecycleDispatcher 는 논리 operation 수와 무관하게 정확히 한 번 실행하며 성공·실패 모두 `original` 물리 입력의 `tool_name`을 matcher 입력으로 사용한다. dispatcher가 physical `apply_patch`를 logical `Edit`으로 해석한다.
- 정규화에 실패하면 원래 cwd 의 실제 maencof vault marker 를 기준으로 vault 안에서는 파싱 사유와 함께 deny 하고, vault 밖에서는 pass 한다.
- concern 차단은 최종 출력에서 PreToolUse permission deny envelope 로 번역한다. top-level `continue: false` 를 직접 출력하지 않는다.

## API Contracts

- `orchestratePreToolUse(input: DispatchInput): MergedHookOutput` — 단일 논리 호출을 batch 계약으로 위임하는 호환 wrapper 다.
- `orchestratePreToolUseBatch(result: NormalizeCodexToolUsesResult<DispatchInput>): MergedHookOutput` — 성공 결과의 `toolUses` 를 순서대로 guard에 라우팅하고 `original` 로 lifecycle 을 한 번 실행한다. 실패 결과도 `original` 로 lifecycle 을 한 번 실행한 뒤 vault 범위에 따라 deny 또는 pass 한다.
- batch 라우팅은 각 concern 을 `safeConcern` 으로 격리하고 최종 결과를 `mergeHookOutput` 으로 합친다.

## Acceptance Criteria

### AC-ordered-deny-wins — 순서 보존과 deny 우선

- 첫 operation 이 허용되어도 뒤의 L1 operation 이 거부되면 전체 호출이 deny 되고 뒤 경로의 사유가 남는다.
- 첫 operation 이 이미 거부돼도 후속 operation을 계속 판정하며, 뒤 L1 경로의 사유도 최종 결과에 남는다.
- Move의 source `Delete`와 destination `Write`도 같은 순서로 판정해 일반 경로 rename은 허용하고 L1 source rename은 거부한다.

### AC-delete-layer1 — Delete L1 보호

- Layer 1 문서의 `Delete` 는 `Write`·`Edit` 과 같은 layerGuard 판정을 받아 deny 된다.
- host가 Layer 1으로 해석하는 case alias·symlink ancestor와 Layer 1 terminal symlink entry Delete도 deny 된다.

### AC-lifecycle-once — 물리 호출당 lifecycle 한 번

- 여러 논리 operation 이 있어도 lifecycle 은 `original` 물리 입력을 matcher 입력으로 정확히 한 번 실행된다.
- malformed 결과도 vault 안·밖 모두 lifecycle 을 같은 `original` 입력으로 정확히 한 번 실행한다.

### AC-malformed-scope — malformed 범위 판정

- malformed 호출은 실제 maencof vault 안에서 유효한 V4A 재발행 안내와 함께 deny 되고 vault 밖에서 pass 된다.

## Last Updated

2026-08-23 — guard의 ordered Move batch, malformed V4A 안내와 original physical lifecycle 경계를 계약화했다.
