# SessionEnd 재설계 — 당위성 · 방향 · 옵션 (ADR)

> 결정 기록(Architecture Decision Record). `SessionEnd` 훅을 기반 로직에서 **제외**하고 다른 메커니즘으로 이전해야 하는 **당위성**과, 그 **변경 방향 3옵션**(파괴성 동반 가능)을 우리 컴파일러 설계와 엮어 기술한다. 컴파일러 지원 현황은 [usage.md](./usage.md) §5·[TODO.md](./TODO.md) §3, 근거 매트릭스는 [host-capability-matrix.md](./host-capability-matrix.md).

---

## 0. 요약 (TL;DR)

- **당위성**: `SessionEnd`(세션당 1회 훅)는 **3-호스트 중 Claude 에만** 존재한다. Codex 는 플러그인 훅 자체가 없고, agy 의 `Stop` 은 **매 턴 종료마다** 발화한다. 그래서 SessionEnd 를 훅으로 두는 한 이식은 불가능하거나(코덱스) 위험하다(agy 에 매핑하면 무거운 종료작업을 매 턴 실행). SessionEnd 가 다루는 일(정리·커밋·recap)은 본질적으로 **대화 이벤트가 아니라 프로세스 수명주기** 관심사다.
- **공통 신호**: 세 호스트 모두 **MCP 서버를 세션당 spawn/kill** 한다 → MCP 서버 프로세스의 종료가 유일한 3-호스트 공통 "세션 종료" 신호다.
- **옵션**: ① shutdown 직접 이전(단순·파괴적, Type R 손실) · ② Stop 경량수집 → shutdown 처리(2단계, Type R 부분구제) · ③ Session Finalizer 추상화(의미보존·최대인프라, 결과는 항상 일어나되 시점만 지연).
- **권장**: **작업 종류별 계층 채택** — 정리성(Type C)은 지금 ①로(컴파일러 `mcp-lifecycle` 이미 지원), 커밋/​recap(Type P·R)은 ③의 event-source 저널 + boot-sweep 로 점진 이관. ②는 ①/③ 사이의 중간 도구로 필요 시.

---

## 1. 배경 · 문제 정의

`SessionEnd` 는 Claude Code 훅으로, **세션이 끝날 때 1회** 발화한다. ogham 에서 여기에 몰린 일:

| 플러그인 | SessionEnd 작업                                                  | 무게              |
| -------- | ---------------------------------------------------------------- | ----------------- |
| filid    | 해당 세션 캐시 파일 삭제(`session-context-*`·`cached-context-*`) | 가벼움(파일 삭제) |
| imbas    | 세션 정리                                                        | 가벼움            |
| maencof  | **vault git commit + recap 생성**                                | 무거움(git + LLM) |

3-호스트 훅 능력:

```
                SessionEnd 훅?    "세션 종료" 신호?
Claude Code      ✅ 네이티브       SessionEnd (1회/세션)
Codex            ❌ 플러그인 훅 없음   —
Antigravity(agy) ❌ (5 이벤트뿐)    Stop = 매 턴(실행 루프) 종료
```

→ **SessionEnd 는 Claude 전용 훅이다.** 이대로면 Codex 는 실행 불가, agy 는 `Stop` 오매핑 시 무거운 종료작업이 매 턴 돈다.

---

## 2. 당위성 — 왜 제외/이전해야 하는가

1. **이식성 (핵심)**: 훅 기반 SessionEnd 는 3-호스트 중 1개만 커버한다. 멀티호스트 생태계에서 "한 정본 → 전 호스트" 원칙에 정면으로 어긋난다.
2. **오매핑의 위험**: agy `Stop` 은 매 실행 루프(턴) 종료마다 발화한다. SessionEnd 를 여기 매핑하면 filid 캐시 삭제가 매 턴(사용 중 캐시까지) 실행되고, maencof vault commit/recap 이 **매 턴** 돌아 성능·정합성 재앙이 된다. "세션당 1회" 의미를 `Stop` 으로는 만들 수 없다.
3. **단일 구현 원칙**: 현행 대안(Claude 훅 + Codex 드롭+보상 + agy 드롭+보상)은 **4갈래 유지**다. MCP 수명주기 이전은 **1개 구현**으로 3-호스트 공통 → 유지비 급감.
4. **아키텍처 정합**: 정리(cleanup)·완결(finalize)은 "대화가 끝났다"가 아니라 "프로세스가 끝난다"의 관심사다. **MCP 서버 프로세스는 세션과 1:1 수명**을 가지므로(세션당 spawn/kill), 종료 로직의 자연스러운 소유자다. SessionEnd 훅은 이 관심사를 호스트 UI 레이어에 잘못 얹은 것.
5. **신뢰성**: 훅은 호스트가 "호출을 보장"해야 성립한다. 반면 프로세스 종료 시그널(SIGTERM/stdin close)은 OS/런타임 수준 신호이고, 놓쳐도 **다음 세션 부팅 sweep** 이라는 안전망을 붙일 수 있다(멱등 정리).

> 결론: SessionEnd 는 **훅에서 빼고**, 3-호스트 공통 신호인 **MCP 서버 수명주기**로 옮기는 것이 이식성·정합성·유지비 모두에서 옳다. 남는 질문은 "무거운/모델-필요 작업(recap)을 어디까지 보존하느냐"이며, 이것이 옵션을 가른다.

---

## 3. 공통 신호 — MCP 서버 프로세스 수명주기

```
세션 시작 ──► 호스트가 plugin MCP 서버 spawn (stdio)
   │            서버: initialize → tools/list → ... (세션 내내 살아있음)
   │
세션 종료 ──► 호스트가 stdin close / SIGTERM → 서버 프로세스 종료
                  ▲ 여기가 3-호스트 공통 "세션 종료" 지점
다음 세션 시작 ─► 서버 재spawn → boot 시 stale sweep (지난 세션 잔여 완결)  ← 안전망
```

Node 서버가 잡을 수 있는 종료 신호: `process.on('SIGTERM'|'SIGINT')`, stdin `'end'`/`'close'`, `process.on('beforeExit')`.

**제약 (설계를 가르는 물리)**:

- **동기 작업만 완주 보장**. `beforeExit`/`exit` 는 동기만, SIGTERM 핸들러의 async 는 호스트가 grace(수백 ms~수 초) 후 SIGKILL 하면 **중도 절단**될 수 있다.
- **모델 호출 불가**. 죽어가는 서버 프로세스에 LLM 추론 시간·접근이 없다. recap 같은 "모델이 필요한" 작업은 shutdown 시점에 **원천 불가**.
- **agy 서버 기동 자체가 미검증**. 헤드리스 `--print` 에서 플러그인 MCP 미스폰 실측 — 인터랙티브 기동은 잔여 게이트. agy 수명주기 보상은 이 게이트에 의존.

작업을 이 물리에 비추어 3종으로 나눈다:

| 종류                      | 예                          | 성격           | shutdown 실현성             |
| ------------------------- | --------------------------- | -------------- | --------------------------- |
| **Type C (Cleanup)**      | filid 캐시 삭제, imbas 정리 | 동기·빠름      | 🟢 신뢰                     |
| **Type P (Persist)**      | maencof vault git commit    | 빠른 async     | 🟡 best-effort + boot-sweep |
| **Type R (Recap/Reason)** | maencof LLM recap           | 느림·모델 필요 | 🔴 shutdown 불가            |

---

## 4. 옵션 (파괴성 동반 — 택1 또는 계층 채택)

세 옵션 모두 "SessionEnd 훅 제거"는 공통. 차이는 **무거운/모델-필요 작업을 어떻게 보존하느냐**.

### 옵션 1 — SessionEnd → MCP shutdown 직접 이전

전체 SessionEnd 로직을 MCP 서버의 종료 핸들러로 그대로 옮긴다.

```
플러그인 MCP 서버 (bridge/mcp-server.cjs)
  process.on('SIGTERM', () => { /* 기존 SessionEnd 로직 (동기 우선) */ })
  stdin.on('close',    () => { ... })
SessionEnd 훅 → 전 호스트에서 제거 (Claude 포함)
```

- **컴파일러 지원**: **이미 구현됨.** `plugin.yaml: hooks: { SessionEnd: mcp-lifecycle }` → SessionEnd 를 Claude·Codex·agy 어디에도 훅으로 안 낸다(손실 경고 없음).
- **파괴성**: 🔴 **높음**. 각 플러그인의 SessionEnd 로직을 서버 shutdown 핸들러로 재작성 + SessionEnd 훅 제거. Claude 동작도 바뀜(등가 게이트에서 SessionEnd 오라클 제외 필요).
- **커버리지**: Type C 🟢 / Type P 🟡(best-effort) / Type R 🔴(손실).
- **장**: 가장 단순한 멘탈 모델, 단일 구현, 훅 어휘에서 SessionEnd 완전 제거.
- **단·리스크**: recap 손실. async 미완주 위험. agy 서버 수명주기 미검증. 무거운 작업이 종료 grace 를 넘기면 유실(boot-sweep 없인).

**적합**: 정리 전용 플러그인(filid·imbas). maencof 는 commit 만 부분, recap 손실 감수 시.

---

### 옵션 2 — Stop 경량수집 → mcpShutdown 최종처리 (2단계)

`Stop`(매 턴 종료)에서는 **빠르고 짧게 델타만 수집/누적**(append-only, 무거운 처리 금지)하고, 실제 완결은 MCP shutdown 에서 한다.

```
매 턴 종료   ─► Stop 훅: 이번 턴의 변경 요약/파일목록을 저널에 append (수 ms)
   ...(세션 내 반복)...
세션 종료    ─► MCP shutdown: 저널을 읽어 commit / 정리 (동기·빠름 우선)
```

- **컴파일러 지원**: 부분. 수집기는 `fallback: stop`(agy `Stop` emit; Claude 는 `Stop` 훅) + 완결기는 `mcp-lifecycle`(shutdown). **하이브리드라 정본이 두 훅을 선언**해야 하고, "같은 논리작업의 두 단계"를 컴파일러가 한 단위로 표현하진 않는다(현재는 별개 훅 2개로 취급). 표현 개선 여지.
- **파괴성**: 🟡 **중간**. SessionEnd 로직을 "증분 수집기"와 "최종 처리기"로 **이원화 재작성**. Stop 은 매 턴이라 수집기는 진짜 경량이어야(무거우면 옵션 1의 매-턴 재앙 재현).
- **커버리지**: Type C 🟢 / Type P 🟢(증분 스테이징으로 shutdown 부담 감소) / Type R 🟡(매 턴 recap 델타 누적 → shutdown 에서 조립. 단 최종 LLM 호출이 필요하면 여전히 shutdown 불가 → 옵션 3 로).
- **장**: 무거운 일을 매 턴 조금씩 분산 → shutdown 순간의 부담↓, 절단 위험↓. Type P/R 을 부분 구제.
- **단·리스크**: 로직 이원화 복잡도. Stop 이 agy stdin 계약(camelCase) 필요 → 러너 어댑터 전제. Claude 에도 Stop 훅이 추가되어 동작 변경.

**적합**: 무거운 종료작업을 매 턴 증분화할 수 있는 플러그인. maencof commit(파일 스테이징을 매 턴) 등.

---

### 옵션 3 — Session Finalizer 추상화 + 계층적 보장 (의미 보존)

"세션이 언제 끝나는지"에 **의존하지 않는다.** 플러그인은 호스트 중립 `finalize(reason, ctx)` **하나**를 작성하고, 런타임이 호스트별 **최선 트리거**에 바인딩하며, **멱등·재개 가능**하게 만들어 **결과가 반드시 일어나되 시점만 우아하게 지연**되게 한다.

```
플러그인: onSessionFinalize(reason, ctx)   ← 단일 정본 로직 (호스트 무지)
                    │  런타임(@ogham/session-finalizer 류)이 바인딩:
   ┌────────────────┼─────────────────────────────┐
   ▼                ▼                              ▼
Claude:          Codex/agy:                    전 호스트:
SessionEnd 훅     MCP shutdown                  다음 세션 boot-sweep
(완전, 세션끝)     (best-effort, 세션끝)          (보장, 지연)
                    │
  Type R(recap): 세션 중 매 턴 저널 append(경량) → finalize 는 "조립/발행"만.
  finalize 가 못 끝내면(모델 필요·프로세스 종료) 저널 persist → 다음 boot 에서 완결.
```

핵심 규약:

- **단일 API**: 플러그인은 `finalize` 하나만 구현(현행 SessionEnd 로직을 여기로). 호스트 분기 없음.
- **멱등 + 재개**: `finalize` 는 진행상태를 기록. 중도 절단되면 boot-sweep 이 **이어서 완결**. 두 번 실행돼도 안전.
- **event-source 저널**: Type R(recap)·Type P(commit) 는 세션 중 **델타를 append**(경량). finalize/boot 는 무겁게 재계산하지 않고 **누적분을 완결**. 모델-필요 recap 도 다음 boot(모델 접근 가능한 살아있는 서버)에서 조립 → **결과 보존, 시점만 다음 세션으로 지연**.
- **트리거 계층**: Claude 는 SessionEnd 로 즉시·완전. Codex/agy 는 shutdown 로 best-effort, 못 끝내면 boot-sweep 로 반드시 완결.

- **컴파일러 지원**: `mcp-lifecycle`(훅 미emit) + **런타임 라이브러리 신설**(`@ogham/session-finalizer`: finalize 등록·저널·멱등가드·boot-sweep). 컴파일러는 훅을 안 내고, 런타임이 소유 → 정본은 `hooks: { SessionEnd: mcp-lifecycle }` 만.
- **파괴성**: 🟠 **중~높음** — 그러나 **의미 보존형**. SessionEnd 로직을 finalizer + 저널로 재작성 + 런타임 라이브러리 도입(공유). 인프라는 최대이나 플러그인은 **한 번만** 작성.
- **커버리지**: Type C 🟢 / Type P 🟢 / **Type R 🟢(지연 완결)** — 원 의미(결국 recap·commit 이 완전히 일어남)를 유일하게 보존.
- **장**: 의미 최대 보존, 플러그인 코드 단일화, "세션 종료 트리거 신뢰성"에 대한 의존 제거(boot-sweep 보장). Claude 는 여전히 즉시.
- **단·리스크**: 최대 인프라(런타임 라이브러리 + 저널 스토리지 + 멱등 설계). recap 이 **다음 세션에 늦게** 뜨는 UX 변화(비-Claude). 저널 스키마·정리 정책 필요.

**적합**: recap/commit 처럼 "반드시 일어나야 하는" 종료작업(maencof). 장기 정본.

---

## 5. 비교 매트릭스

| 축                  | 옵션 1 (shutdown 직접) | 옵션 2 (Stop수집→shutdown)           | 옵션 3 (Finalizer 추상)       |
| ------------------- | ---------------------- | ------------------------------------ | ----------------------------- |
| 이식(3-호스트 공통) | 🟢                     | 🟡(Stop 계약 필요)                   | 🟢                            |
| Type C (정리)       | 🟢                     | 🟢                                   | 🟢                            |
| Type P (commit)     | 🟡 best-effort         | 🟢 증분                              | 🟢 보장(지연)                 |
| Type R (recap)      | 🔴 손실                | 🟡 부분                              | 🟢 보장(지연)                 |
| 의미 보존           | 낮음                   | 중                                   | **높음**                      |
| 파괴성              | 🔴 높음                | 🟡 중                                | 🟠 중~높음                    |
| 필요 인프라         | 최소(shutdown 핸들러)  | 중(수집기+처리기+러너)               | 최대(finalizer 런타임+저널)   |
| 컴파일러 현재 지원  | ✅ `mcp-lifecycle`     | △ `stop`+`mcp-lifecycle`(하이브리드) | `mcp-lifecycle` + 런타임 신설 |
| Claude 즉시성       | 유지(제거 후 shutdown) | 유지(+Stop)                          | **유지(SessionEnd)**          |

---

## 6. 권장 — 작업 종류별 계층 채택 (파괴 최소화)

한 옵션을 전면 강제하지 않고, **작업 종류로 나눠 점진 채택**한다(리스크·파괴 최소):

1. **Type C (정리) → 지금 옵션 1.** filid·imbas 의 캐시/정리를 MCP shutdown 핸들러로 이전 + `hooks: { SessionEnd: mcp-lifecycle }`. 컴파일러 지원 완료, 파괴성 낮음(정리는 동기·손실 무해).
2. **Type P·R (commit·recap) → 옵션 3 로 점진.** maencof 를 finalizer + event-source 저널로 재설계. `@ogham/session-finalizer` 런타임을 shared 로 신설(cross-platform·http-guard 처럼 재사용). recap 은 저널 누적 → shutdown/boot 완결.
3. **옵션 2 는 도구**로만: Type P/R 을 옵션 3 없이 부분 구제해야 하는 과도기 플러그인에 한해 `stop`+`mcp-lifecycle` 하이브리드.

이 계층은 "지금 안전하게 되는 것(정리)"을 먼저 이관하고, "인프라가 필요한 것(recap 보존)"을 나중에 완성한다.

---

## 7. 우리 설계와의 연동

- **컴파일러 (완료)**: `mcp-lifecycle` fallback — SessionEnd 를 전 호스트 훅에서 미emit, 손실 경고 없음(런타임 소유 선언). 옵션 1·3 의 컴파일러 측 지원은 끝. 옵션 2 는 `stop`+`mcp-lifecycle` 두 훅 선언으로 가능(하이브리드 표현 개선은 후속).
- **런타임 (미구현, Stage D)**:
  - 옵션 1: 각 플러그인 서버에 shutdown 핸들러(SIGTERM/stdin close).
  - 옵션 2: Stop 수집기(agy 러너 어댑터 전제) + shutdown 처리기.
  - 옵션 3: `@ogham/session-finalizer`(finalize 등록·저널·멱등·boot-sweep) — shared 워크스페이스 신설.
  - 공통: **MCP-부팅 stale-sweep**(다음 세션 시작 시 지난 세션 잔여 완결) — [TODO.md](./TODO.md) §4.
- **마이그레이션 순서**: SessionEnd 이관은 **플러그인별·이 PR 무관**. 정리 전용(filid·imbas)부터 옵션 1, maencof 는 옵션 3. [TODO.md](./TODO.md) §3·§5.

---

## 8. 미해결 · 실측 게이트

- **agy 서버 수명주기**: 헤드리스 `--print` 미스폰 실측 — 인터랙티브 기동·shutdown 신호 수신 여부가 옵션 1·3 의 agy 보상 전제(잔여 게이트).
- **호스트별 shutdown grace**: SIGTERM 후 SIGKILL 까지 여유(호스트마다 상이) 실측 — Type P async 완주 가능성 판정.
- **boot-sweep 신뢰성**: 서버가 매 세션 재spawn 되는지(특히 agy) 확인 — 옵션 3 의 "지연 완결" 보장 전제.
- **저널 스토리지**: event-source 저널 위치·스키마·정리(TTL) 정책 — 옵션 3 채택 시 설계 필요.
