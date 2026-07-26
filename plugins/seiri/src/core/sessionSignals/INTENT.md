# sessionSignals — 세션 스코프 신호 상태

## Purpose

세션 안에서만 뜻이 있는 상태를 담는다. 둘 — 같은 Bash 명령이 연달아 실패한 횟수, 마지막으로 로드된 워크플로우. **판정을 소유하지 않는다**: "몇 번째인가"· "어디까지 왔나"만 답하고, 그것이 무슨 뜻인지는 모델이 판단한다.

## Structure

```
index.ts   barrel (외부 소비자 전용 — 훅은 organ 을 직접 import)
record/    organ — recordBashFailure · recordBashSuccess · recordWorkflowState · consumeWorkflowState
store/     organ — readSignals · writeSignals (`.seiri/session-signals.json`)
utils/     organ — hashCommand · resolveSignalsPath · isWorkflowSignal
```

## Conventions

- 파일은 **session_id 로 소유권을 갖는다.** 다른 세션의 파일은 병합하지 않고 부재로 취급한다 — 다음 쓰기가 덮으므로 별도 청소 훅이 필요 없다.
- 명령은 **해시로만** 저장한다. 필요한 건 "직전과 같은 명령인가" 동치 판정 뿐이고, 실행 명령 전문을 남기는 건 아무도 요구하지 않은 부채다.
- 읽기는 절대 throw 하지 않는다. 손상·타 세션 파일은 빈 상태로 시작한다.
- 카운터는 **명령별**이고 추적 수에 상한이 있다 — 스크래치패드지 로그가 아니다.
- 워크플로우 상태는 **로드마다 재무장, 1회 소비**한다. 매 턴 되풀이하면 배너가 되고, 배너는 무시당한다.

## Boundaries

### Always do

- 쓰기는 `ensureSeiriDir` 경유 — `.gitignore` 가 같이 생겨야 비추적이 보장된다.
- 새 신호 전에 "세션이 끝나면 무의미해지는가"를 먼저 답할 것.

### Ask first

- 신호 종류 추가 (상시 훅 비용 증가).
- 임계값·상한 변경 (`constants/failureChain.ts`).

### Never do

- 명령 원문·출력·에러 텍스트 저장.
- 세션 경계를 넘겨 보존 — 커밋 대상도 재현 자료도 아니다.
- 판정 결과를 강제 (차단·decision 제어). 신호는 제안이다.

## Dependencies

- `../utils/`, `../../constants/`, `@ogham/cross-platform/compat`
