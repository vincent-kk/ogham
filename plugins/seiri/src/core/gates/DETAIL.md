# DETAIL — gates

## Requirements

### 원장 해석과 상태

- 훅과 MCP 는 같은 줄 단위 파서를 사용한다. 알 수 없는 줄과 불완전한 필드는 읽기 실패가 아니라 보존 대상이다.
- `CHECK` 와 `EXPECT` 의 같은 길이 여닫는 백틱 런은 Markdown code span 문법이다. 파서는 런과 선택적인 한 쌍의 내부 패딩 공백을 벗기며, 같은 길이 경계 런이 없는 기존 값은 그대로 읽는다.
- 체크박스가 선택되고 증거가 `pending` 으로 시작하지 않을 때만 충족이다. 체크된 `pending` 과 `pending (regressed)` 는 미충족이다.
- `ABANDON` 은 미충족 수에서 제외하지만 별도 목록과 개수로 항상 노출한다.
- 작업은 소문자 kebab-case 이름으로 격리되고, 세션 식별자는 경로와 내용 어디에도 관여하지 않는다.

### 증거와 기록

- 실행 가능한 게이트는 명령 해시가 일치한 도구 결과만 증거로 쓴다. 수동 기록 API 는 `CHECK` 가 있는 게이트를 거부한다.
- 실행 가능한 게이트의 증명은 정규화된 출력 텍스트의 `EXPECT` 매치뿐이다. exit와 호스트 이벤트 이름은 판정을 결정하지 않는다.
- EXPECT가 없으면 `unjudgeable`, 출력이 비면 `unmet — no output`, EXPECT가 불일치하면 `unmet`이다. 이미 충족한 게이트의 non-met 재실행은 종류와 무관하게 체크를 풀고 `pending (regressed)`를 기록한다.
- 한 작업의 읽기-수정-쓰기는 `gates.lock` 으로 직렬화하고, 락을 얻지 못하면 훅을 막지 않도록 그대로 진행한다.
- 락 없이 진행한 쓰기는 원자적 교체라 원장을 깨뜨리지 않지만 동시 갱신 하나를 덮어쓴다. 경합이 보장하는 것은 원장 무결성과 마지막 기록자의 증거이며, 동시 증거 전부의 보존은 락을 얻은 경우에만 성립한다.
- 박스, 증거, 포기는 `gates.md` 안에서만 바뀌며 쓰기는 원자적으로 교체한다.

## API Contracts

| Export                                             | Contract                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `listTaskLedgers(root)`                            | 유효하고 읽을 수 있는 작업 원장을 이름순으로 반환하며 부재·읽기 실패를 던지지 않는다. |
| `readTaskLedger(root, task)`                       | 유효한 작업 이름의 원장 하나를 읽고, 없거나 잘못된 이름이면 `undefined` 를 반환한다.  |
| `computeLedgerStatus(task, path, ledger, opts)`    | 충족·미충족·포기와 다음 게이트를 계산하고 요청할 때만 게이트 상세를 포함한다.         |
| `recordManualEvidence(root, task, gate, evidence)` | 수동 게이트만 충족으로 기록하고 갱신된 상태를 반환한다.                               |
| `abandonGate(root, task, gate, reason)`            | 사유 있는 포기를 원장에 추가하고 갱신된 상태를 반환한다.                              |
| `isTaskName(value)`                                | 작업 이름의 소문자 kebab-case 경계를 좁힌다.                                          |

## Acceptance Criteria

### AC-gates-claim-is-not-proof — 주장은 증명이 아니다

- 체크됐지만 증거가 `pending` 인 게이트는 미충족이다.
- CHECK가 있으나 EXPECT가 없는 게이트는 어떤 호스트에서도 충족되지 않는다.
- 충족 게이트의 unmet·unjudgeable 재실행은 체크를 풀고 `pending (regressed)` 를 남긴다.

### AC-gates-abandon-visible — 포기는 보인다

- 포기된 게이트는 해결로 세되 상태의 별도 목록에 사유와 함께 나타난다.
- 빈 사유의 포기는 거부된다.

### AC-gates-session-independent — 세션을 모른다

- 어떤 함수도 세션 식별자를 입력받거나 원장에 기록하지 않는다.
- 새 프로세스와 세션에서도 같은 작업 이름은 같은 원장 상태를 돌려준다.

### AC-gates-task-isolation — 작업은 이름으로 갈린다

- 한 작업의 수동 기록과 포기는 다른 이름의 원장을 바꾸지 않는다.
- 같은 `CHECK` 가 여러 원장에 있으면 각 원장을 독립적으로 갱신한다.

### AC-gates-no-state-outside-ledger — 원장 밖에 상태 없음

- 지속 상태는 작업의 `gates.md` 에만 있고 `gates.lock` 은 쓰기 구간 뒤 제거된다.
- 포인터·캐시·등록 파일을 만들지 않는다.

### AC-gates-concurrent-integrity — 경합은 원장을 깨지 않는다

- 동시 훅 프로세스가 같은 원장을 갱신해도 게이트 집합과 각 게이트의 `CHECK`·`EXPECT` 는 그대로 남는다.
- 각 게이트는 단일 기록자가 남길 수 있는 상태만 갖는다. 체크된 게이트는 그 실행의 증거를, 체크되지 않은 게이트는 `pending` 을 갖고 둘을 섞은 상태는 없다.
- 경합한 라운드에도 최소 한 게이트의 증거는 남는다. 증거 전부의 보존은 락을 얻었을 때만 요구한다.

## Boundary Exemptions

### `record` — 훅 판정은 concrete 기록 경로를 쓴다

- **Consumers**: `**/src/hooks/postToolUse/**`, `**/src/hooks/userPromptSubmit/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들의 바이트 상한을 지켜야 한다. 배럴을 거치면 재노출 그래프 전체가 포함되어 크기 가드를 넘으므로 판정 기록 경로만 직접 가져온다.

### `render` — 훅 출력은 concrete 렌더 경로를 쓴다

- **Consumers**: `**/src/hooks/postToolUse/**`, `**/src/hooks/userPromptSubmit/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들의 바이트 상한을 지켜야 한다. 배럴을 거치면 재노출 그래프 전체가 포함되어 크기 가드를 넘으므로 필요한 한 줄 렌더만 직접 가져온다.

### `store` — 훅 환기는 concrete 저장 경로를 쓴다

- **Consumers**: `**/src/hooks/postToolUse/**`, `**/src/hooks/userPromptSubmit/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들의 바이트 상한을 지켜야 한다. 배럴을 거치면 재노출 그래프 전체가 포함되어 크기 가드를 넘으므로 원장 조회 경로만 직접 가져온다.

### `status` — 훅 환기는 concrete 상태 계산 경로를 쓴다

- **Consumers**: `**/src/hooks/userPromptSubmit/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들의 바이트 상한을 지켜야 한다. 배럴을 거치면 재노출 그래프 전체가 포함되어 크기 가드를 넘으므로 환기에 필요한 상태 계산만 직접 가져온다.

## History

- 2026-08-24 — 동시 훅 검증이 무손실을 단언해 Windows CI 에서 간헐 실패했다. fail-open 은 훅을 멈추지 않기 위한 의도된 선택이므로 락 예산을 늘리는 대신 보장 범위를 원장 무결성으로 명시했다. 무손실을 다시 단언하면 같은 flake 가 돌아온다.

## Last Updated

2026-08-24 — 락을 얻지 못한 쓰기가 보장하는 범위를 원장 무결성으로 명시했다.
