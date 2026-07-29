# DETAIL — sessionSignals

## Requirements

### 상태 파일

- 상태는 `<repoRoot>/.seiri/session-signals.json` 하나에 담긴다. 읽기·쓰기 모두 `findRepoRoot` 를 거치므로 어느 하위 디렉터리에서 실행해도 같은 파일을 가리킨다.
- 파일은 `sessionId` 로 소유권을 갖는다. 다른 세션의 파일은 병합하지 않고 부재로 취급하며, 다음 쓰기가 통째로 덮는다 — 그래서 별도 청소 훅이 필요 없다.
- 읽기는 절대 throw 하지 않는다. 부재·손상·타 세션은 모두 빈 상태로 시작한다.
- 카운터는 명령 해시별이며 추적 수에 상한이 있다. 상한을 넘으면 삽입 순서가 곧 축출 순서다.
- 쓰기는 `ensureSeiriDir` 를 거친다 — `.gitignore` 가 같은 호출에서 갱신되어야 비추적이 보장된다.

### 동시성

- 읽기-수정-쓰기는 `withSignalsLock` 으로 직렬화한다. 훅은 각각 독립 `node` 프로세스라 한 메시지의 병렬 도구 호출이 같은 파일에 동시 도달하고, 직렬화가 없으면 늦게 쓰는 쪽이 **자신이 읽은 적 없는 필드를 지운다.**
- 유실은 양방향이다. 어느 쪽이 지는지는 타이밍이 정하며, `workflow` 가 사라지면 다음 턴이 상태 절을 잃고 `counts` 가 사라지면 반복 실패가 연쇄 경고를 잃는다.
- 락은 `.seiri/session-signals.lock` 디렉터리다. `mkdir` 이 이름 충돌에 원자적으로 실패하는 것이 test-and-set 이며, 프로세스 경계를 넘는 유일한 수단이다. 존재 확인 후 생성하는 형태는 그 사이가 다시 같은 틈이 되므로 쓰지 않는다.
- `writeAtomically` 는 이 계약을 대신하지 못한다. 그것은 **한 번의 쓰기**가 찢어지지 않게 할 뿐, 읽은 시점부터 쓰는 시점까지의 구간은 보호하지 않는다.
- 락은 두 방향으로 fail-open 한다. 획득 시한을 넘기면 직렬화 없이 그대로 진행하고, `.seiri/` 가 아직 없으면 락을 만들지 않는다. 훅은 턴을 막을 수 없어야 하고, 상태 파일이 없는 프로젝트에는 경쟁할 대상도 없다.
- 홀더가 죽어 남은 락은 훅 타임아웃과 같은 시한이 지나면 다음 호출자가 회수한다.

### 워크플로우 상태

- `Skill` 로드 중 워크플로우 체인 구성원만 기록한다. 다른 플러그인의 스킬과 사용자 게이트는 넘길 상태가 없으므로 남기지 않는다.
- 스킬 id 는 `seiri:` 접두를 벗겨 저장한다.
- 로드마다 재무장하고 다음 턴이 한 번만 소비한다. 소비는 읽기가 아니라 쓰기다 — 매 턴 되풀이하면 배너가 되고, 배너는 무시당한다.

## API Contracts

| Export                                          | Contract                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `recordBashFailure(root, sessionId, command)`   | 실패 1회를 세고 지금이 알릴 순간인지 반환. 명령·세션당 최대 한 번만 `true`.     |
| `recordBashSuccess(root, sessionId, command)`   | 그 명령의 연쇄만 잊는다. 잊을 것이 없으면 **아무것도 쓰지 않는다**.             |
| `recordWorkflowState(root, sessionId, skillId)` | 체인 구성원이면 기록하고 `true`, 아니면 상태를 남기지 않고 `false`.             |
| `consumeWorkflowState(root, sessionId)`         | 아직 말하지 않은 상태를 한 번 반환하고 말한 것으로 표시. 이후에는 `undefined`.  |
| `withSignalsLock(root, mutate)`                 | `mutate` 를 직렬화해 실행하고 결과를 그대로 반환. 예외가 나도 락을 놓고 나간다. |
| `resolveSignalsPath(root)`                      | 저장소 루트 기준 상태 파일의 절대 경로.                                         |

## Acceptance Criteria

### AC-signals-concurrency — 동시 훅이 서로의 필드를 지우지 않는다

- 한 메시지의 `Skill` 과 `Bash` 실패가 동시에 도착해도 `workflow` 와 `counts` 가 **둘 다** 살아남는다. 한 방향만 검사하면 다른 방향이 깨져도 통과한다.
- 검증 대상은 `bridge/` 번들이다. `hooks.json` 이 실행하는 것이 번들이므로, 소스만 검증한 통과는 배송된 훅에 대해 아무것도 말하지 않는다.
- 경쟁을 세우려면 Bash 쪽이 **실패** 경로여야 한다. `recordBashSuccess` 는 잊을 것이 없으면 쓰지 않고 빠지며, 쓰지 않는 경로와는 경쟁이 성립하지 않는다.

### AC-signals-failopen — 락은 턴을 막지 않는다

- 남이 쥔 락은 획득 시한 뒤 포기하고, 호출자는 직렬화 없이 진행한다.
- `.seiri/` 가 없으면 락을 만들지 않고 즉시 실행한다 — 그렇지 않으면 상태 없는 프로젝트가 매 훅마다 획득 시한만큼 손해를 본다.
- 홀더가 죽어 남은 락은 회수된다.

### AC-signals-handoff — 워크플로우 상태는 한 번만 소비된다

- 로드 직후 첫 소비만 스킬 이름을 돌려주고, 같은 로드에 대한 이후 소비는 `undefined` 다.
- 체인 밖 스킬은 상태를 남기지 않는다.

## Boundary Exemptions

### record/ — 훅 번들은 배럴을 통과할 수 없다

- **Consumers**: `src/hooks/postToolUse/`, `src/hooks/userPromptSubmit/`
- **Direct import**: allowed
- **Reason**: 훅은 esbuild 번들로 배송되고 크기 가드를 받는다. `index.ts` 를 거치면 배럴이 재노출하는 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다. typecheck 는 이 비대를 잡지 못하고 `build:hooks` 의 가드만 잡으므로, 배럴 경유는 선택지가 아니라 빌드 실패다. 배럴은 훅 밖 소비자 전용이며, 그래서 `recordWorkflowState` 와 `consumeWorkflowState` 는 배럴에 오르지 않는다.

## Last Updated

2026-07-29
