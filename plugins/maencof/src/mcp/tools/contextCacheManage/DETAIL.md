# contextCacheManage — Contract

## Requirements

- `context_cache_manage` 도구는 매 턴 주입되는 turn context 캐시를 관리한다. `action` 하나로 네 갈래(`pin` · `unpin` · `refresh` · `list`)를 가른다.
- vault 경로 해석 순서는 `input.cwd` → 등록부가 넘긴 vaultPath → `MAENCOF_VAULT_PATH` → 호스트 워크스페이스 루트다. 어느 것도 없으면 `cwd` 를 넘기거나 환경변수를 세우라는 안내와 함께 throw 한다 — vault 밖에서 실행되는 호스트에서 `process.cwd()` 로 조용히 폴백하지 않는다.
- 파일 I/O 를 직접 하지 않는다. 핀 목록 읽기/쓰기와 turn context 읽기/쓰기는 `core/cacheManager` 에, 재조립은 `core/turnContext` 의 `buildTurnContext` 에 위임한다.
- 캐시를 바꾸는 세 액션(`pin` · `unpin` · `refresh`)은 turn context 를 즉시 재빌드해 기록한다. 핀 목록만 바꾸고 캐시를 남겨 두면 다음 턴까지 주입 내용이 핀 상태와 어긋난다.
- 핀은 `node_id` 기준 멱등이다. 이미 핀된 노드를 다시 핀하면 중복 추가 없이 성공으로 끝나고, 없는 노드를 언핀해도 실패가 아니다.
- 핀 총수는 `MAX_PINNED_NODES` 를 넘지 못한다. 초과하면 `pinnedAt` 최신순으로 잘라 가장 오래된 핀부터 밀어낸다.
- 잘못된 입력은 throw 가 아니라 `success: false` + `error` 문자열로 돌려준다 — 미지의 `action` 도 유효 액션 목록과 함께 같은 형태로 거부한다.
- KG 그래프와 무관하므로 `registerReadTool({ needsFreshness: false })` 로 등록된다. 캐시 파일을 쓰지만 그래프 캐시는 건드리지 않는다.

## API Contracts

### Handler

`handleContextCacheManage(vaultPath: string, input): Promise<{ success: boolean } & Record<string, unknown>>`

### Input (`contextCacheManageInputSchema`)

| Field        | Type                                      | Required | Notes                                       |
| ------------ | ----------------------------------------- | -------- | ------------------------------------------- |
| `action`     | `'pin' \| 'unpin' \| 'refresh' \| 'list'` | yes      | 관리 동작                                   |
| `cwd`        | `string`                                  | no       | vault 루트. 생략 시 위의 해석 순서를 따른다 |
| `node_id`    | `string`                                  | no       | `pin` · `unpin` 에 필수                     |
| `node_title` | `string`                                  | no       | `pin` 에 필수                               |
| `node_layer` | `number`                                  | no       | `pin` 에 필수 (레이어 1-5)                  |

필수 조합이 빠진 호출은 `{ success: false, error }` 로 거부된다.

### Output by action

- `pin` — 신규: `{ success, pinned: true, totalPinned, turnContext }`. 이미 핀됨: `{ success: true, message, totalPinned }` (재빌드 없음).
- `unpin` — 제거: `{ success, unpinned: true, totalPinned }`. 대상 없음: `{ success: true, unpinned: false, reason, totalPinned }` (재빌드 없음).
- `refresh` — `{ success, refreshed: true, turnContext }`.
- `list` — `{ success, pinnedNodes, turnContext }`. 캐시가 비었으면 `turnContext` 는 `'(no cached turn context)'`.

### Pinned node shape (`PinnedNode`)

`{ id, title, layer, pinnedAt }` — `pinnedAt` 은 ISO 문자열이고 상한 초과 시 축출 기준이 된다.

## Acceptance Criteria

### AC-vault-path-explicit — vault 경로 명시 해석

- `cwd` · vaultPath · `MAENCOF_VAULT_PATH` · 호스트 워크스페이스 루트 중 어느 것도 해석되지 않으면 throw 한다.

### AC-pin-idempotent — 핀 멱등

- 같은 `node_id` 를 다시 핀해도 목록에 중복이 생기지 않는다.

### AC-pin-cap — 핀 상한

- 핀 수가 `MAX_PINNED_NODES` 를 넘지 않고, 초과분은 오래된 것부터 축출된다.

### AC-mutation-rebuilds-context — 변경 시 재빌드

- 핀 목록이 실제로 바뀌거나 `refresh` 를 부르면 turn context 가 재빌드되어 기록된다.

### AC-invalid-input-not-thrown — 입력 오류 비예외

- 필수 필드 누락과 미지의 `action` 이 예외 대신 `success: false` + `error` 로 반환된다.

## Last Updated

2026-07-30 — vault 경로 해석·핀 멱등/상한·변경 시 재빌드 계약과 액션별 출력 형태를 문서화했다.
