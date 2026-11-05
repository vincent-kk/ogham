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
- `CHECK` 가 결과 조건까지 검사하고 충족된 경우에만 고정 성공 문자열을 출력한다. 단순 조회 명령의 정상 종료는 결과 조건의 검사를 대신하지 못한다.
- `EXPECT` 는 양끝 공백을 정리한 대소문자 구분 리터럴 부분문자열이며, 하나의 관측 출력 줄 안에서만 일치한다. 슬래시·정규식 메타문자·플래그는 일반 문자다. 정규식 실행이나 구형 원장 이관은 하지 않는다. CHECK/EXPECT 쌍이 고정 성공 문자열을 계약하므로 저장소 패턴을 훅에서 실행할 필요가 없고 관측 출력 기반 증명은 유지된다.
- EXPECT가 없으면 `unjudgeable`, 출력이 비면 `unmet — no output`, EXPECT가 불일치하면 고정 사유의 `unmet`이다. 불일치 사유에는 저장소가 쓴 EXPECT 원문을 넣지 않는다. 저장소 원문이 훅 컨텍스트의 지시문으로 운반되지 않게 하기 위해서다. 이미 충족한 게이트의 non-met 재실행은 종류와 무관하게 체크를 풀고 `pending (regressed)`를 기록한다.
- 한 작업의 읽기-수정-쓰기는 `gates.lock` 으로 직렬화하고, 락을 얻지 못하면 훅을 막지 않도록 그대로 진행한다.
- 락 없이 진행한 쓰기는 원자적 교체라 원장을 깨뜨리지 않지만 동시 갱신 하나를 덮어쓴다. 경합이 보장하는 것은 원장 무결성과 마지막 기록자의 증거이며, 동시 증거 전부의 보존은 락을 얻은 경우에만 성립한다.
- 명시 API의 fail-open은 훅을 멈추지 않기 위한 선택이다. 경합 검증은 무손실 대신 원장 무결성을 요구하며, 락 예산 증가로 무손실을 단언하면 Windows의 간헐 실패를 되살린다.
- 박스, 증거, 포기는 `gates.md` 안에서만 바뀌며 쓰기는 원자적으로 교체한다.

### 보존

- MCP 서버 시작 시 `sweepStaleTasks`가 `.seiri/tasks`에서 디렉터리 자신과 모든 하위 항목이 72시간 넘게 수정되지 않은 항목을 정리한다. 원장을 영구 보존하지 않는 이유는 런타임 디렉터리가 끝없이 커지지 않게 하기 위해서다.
- 작업 디렉터리는 `gates.lock`을 잡고 lock과 디렉터리 자신을 제외한 하위 항목을 다시 확인한 뒤 통째로 삭제한다. 사라진 항목은 건너뛰고 심볼릭 링크는 따라가지 않는다.
- git 추적·ignore 여부는 보지 않는다. gates는 프로세스를 띄우지 않는다.

## API Contracts

공개 함수는 진입점에서, 증거·격리·실패 계약은 Requirements와 Acceptance Criteria에서 확인한다.

## Acceptance Criteria

### AC-gates-literal-expect — EXPECT는 리터럴 성공 문자열이다

- 정규식처럼 보이는 EXPECT도 전체 문자열 그대로 비교한다. 그 문자열이 없는 출력은 정규식으로는 일치하더라도 미충족이다.
- 일반 문자열의 대소문자 구분, 양끝 공백 정리, 줄 단위 부분문자열 매칭과 첫 일치 줄의 반환을 유지한다.
- CHECK가 검사하는 값이 달라져도 실제 조건이 충족되면 같은 성공 문자열로 증명한다. 조건이 틀리면 성공 문자열을 출력하지 않아 exit 정보 없는 관측 결과도 미충족이다.

### AC-gates-session-independent — 세션을 모른다

- 어떤 함수도 세션 식별자를 입력받거나 원장에 기록하지 않는다.
- 새 프로세스와 세션에서도 같은 작업 이름은 같은 원장 상태를 돌려준다.

### AC-gates-task-isolation — 작업은 이름으로 갈린다

- 한 작업의 수동 기록과 포기는 다른 이름의 원장을 바꾸지 않는다.
- 같은 `CHECK` 가 여러 원장에 있으면 각 원장을 독립적으로 갱신한다.
- 자동 워크플로우 훅은 `recordCheckOutcome`의 선택적 task 인자로 active task 원장 하나만 조회한다. task 생략 시 기존 전체 작업 API 의미를 유지한다.
- task를 지정한 자동 기록은 gate lock 획득 실패 시 쓰지 않는다. 기존 명시 API의 fail-open 호환성은 유지한다.

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

## Last Updated

원장 문법·증거·격리·경합·보존 계약의 내용과 근거가 바뀔 때 갱신한다.
