# filid 플러그인 동작 분석 보고서 — Claude 관점 흐름 검증

- **날짜**: 2026-07-07
- **대상**: `plugins/filid` v0.6.3 (훅 5종 · MCP 도구 18종 · 스킬 19종 · 에이전트 14종)
- **관점**: 플러그인을 실제로 소비하는 쪽, 즉 **Claude(메인 세션·서브에이전트)가 겪는 런타임 흐름**에서 막히거나, 어색하거나, 끊기거나, 오작동할 수 있는 지점을 찾고 — 심증을 **테스트로 실증/반증**한다.
- **수정 없음**: 본 보고서는 분석·검증·개선방향 제시만 하며 코드를 변경하지 않았다.

---

## 1. 요약

표면 계약(훅 등록, MCP 도구 18종의 명명·스키마, 스킬의 full-form 도구 참조, 에이전트 정의)은 **전반적으로 정합**하며, 단위 테스트 1,089개 전부 통과, 훅 레이턴시도 중앙값 ~75ms로 양호하다. 그러나 단위 테스트가 커버하지 못하는 **통합·계약 레벨에서 확정 결함 10건**이 실측으로 확인되었다.

| #   | 확정 결함 (CONFIRMED)                                                                                  | 심각도   | 검증 방법                            |
| --- | ------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------ |
| F1  | 모노레포에서 패키지 간 relDir 충돌 → 두 번째 패키지의 INTENT.md **주입 누락**                          | **높음** | 합성 이벤트 B1–B4                    |
| F2  | structure-guard가 절대경로 전체를 세그먼트로 오처리 → 구조 검사 무력화 + 상시 이름-폴백 오경보         | **높음** | 합성 이벤트 G1, C2/C5                |
| F3  | fmap 캐시 동시 쓰기 유실 (병렬 Read 배치에서 방문 기록 소실)                                           | 중간     | 경합 프로브 (1/5 재현)               |
| F4  | cross-review/pipeline Phase D가 **현행 도구 표면에 없는 API**(`TeamCreate`/`TeamDelete`/`Task`) 참조   | **높음** | ToolSearch 실측                      |
| F5  | SubagentStart 역할 제약 키(bare)와 스킬 스폰 문자열(`filid:*`) 불일치 → 제약 미주입                    | 중간     | 핸들러 A1/A2 + 스폰 문자열 전수 grep |
| F6  | `fractal_scan` 결과 과대(72KB~413KB 단일라인) → 도구 결과 캡 초과, scan 스킬 Phase 1 가정 붕괴         | **높음** | 실 MCP 호출 2건                      |
| F7  | `fractal_navigate` classify가 `entries: []`에서 INTENT.md 보유 fractal을 **organ으로 오판**            | 중간     | 실 MCP 호출                          |
| F8  | 빈 내용 INTENT.md `Write`는 검증 우회 (3-tier/50줄 검사 미실행)                                        | 낮음     | 합성 이벤트 C2                       |
| F9  | 비-FCA 프로젝트에서도 문서 계약 deny 강제 (validator에 FCA 게이트 부재)                                | 중간     | 합성 이벤트 C5                       |
| F10 | `unread-intent` 신호 도달 불가(죽은 기능) + [filid:guide] 문구 2건 부정확 + 주입 범위 문서-코드 불일치 | 낮음     | 코드 불변식 + 전 프로브              |

반대로, 사전 심증 중 **5건은 오해로 판명**되었고(§5), 문서 계약 차단(50줄 캡, DETAIL append-only, criteria 원장)의 핵심 경로는 **설계대로 정확히 동작**함을 확인했다.

---

## 2. 분석 방법

정적 추적(훅 오케스트레이터 → 헬퍼 → core, 스킬/에이전트 문서) 후, 심증마다 아래 4가지 방법으로 실증했다.

1. **합성 이벤트 주입**: `bridge/*.mjs`를 `libs/run.cjs` 경유로 직접 spawn하고 stdin에 실제 Claude Code 페이로드 형태의 JSON을 공급 (하네스: 세션 스크래치 `hookprobe/runner.mjs`, `raceprobe.mjs`, `timeprobe.mjs` — 재현 방법은 부록 A). PreToolUse 시뮬레이션은 대상 파일을 절대 변형하지 않는다.
2. **실 MCP 호출**: 이 세션에 로드된 `mcp__plugin_filid_t__*` 도구를 직접 호출.
3. **라이브 프로브**: 실제 `Agent` 도구로 `filid:qa-reviewer` / `general-purpose` 서브에이전트를 스폰해 SubagentStart 주입 내용 회수를 시도 (프로브 미회신으로 직접 캡처는 미완 — F5 본문에 한계 명시).
4. **기존 스위트**: `yarn filid test:run` → **102 파일 / 1,089 테스트 통과, 5 skipped** (baseline 건강).

판정 라벨: **CONFIRMED**(재현·실측 성공) / **REFUTED**(반증) / **DESIGN**(의도된 동작으로 확인) / **UNTESTED**(실측 불가, 명시).

---

## 3. Claude 관점 동작 지도

Claude가 한 세션에서 filid를 겪는 순서:

1. **SessionStart** → `setup.mjs`: 캐시 디렉토리 생성, INTENT.md 자동 감지 시 `.filid/` 마커 생성, 만료 캐시 prune. FCA 프로젝트면 `[filid] Session initialized...` 1줄 주입.
2. **UserPromptSubmit** → `user-prompt-submit.mjs`: **매 프롬프트 fmap 리셋**(턴 단위 재주입 유도), 세션 첫 프롬프트에만 규칙 포인터 + `[filid:lang]` 주입, spike 브랜치면 매 프롬프트 배너.
3. **PreToolUse(Read)** → `pre-tool-use.mjs` › intentInjector: 세션 첫 ctx 직전 `[filid:guide]` 1회, 경계(가장 가까운 `package.json`) 내 디렉토리 최초 방문 시 `[filid:ctx]`(INTENT.md 인라인 + chain + detail 힌트), 매회 `[filid:map]`.
4. **PreToolUse(Write|Edit)** → preToolValidator(INTENT 50줄 캡·DETAIL append-only·criteria 원장 → `permissionDecision: deny`) + structureGuard(재분류 info / organ-서브디렉토리·순환 import warn — 차단 없음) + spike 면제 게이트 + mode audit.
5. **SubagentStart** → `agent-enforcer.mjs`: 에이전트 타입별 역할 제약/워크플로 가이드/언어 태그 주입.
6. **SessionEnd** → `session-cleanup.mjs`: 세션 캐시 파일 삭제.
7. **스킬 실행 시**: SKILL.md 지시에 따라 MCP 18종 호출, `filid:*` 서브에이전트 스폰, `Skill()` 체이닝(pipeline: pr-create→review→resolve→revalidate).

이 지도 위에서, 아래 문제들이 흐름을 끊거나 왜곡한다.

---

## 4. 확정된 문제 (CONFIRMED)

### F1. 모노레포 relDir 충돌 — 두 번째 패키지의 INTENT 주입 누락 【높음】

**현상**: 한 턴에서 서로 다른 패키지의 같은 상대경로를 읽으면, 두 번째 패키지의 `[filid:ctx]`(INTENT.md 인라인)가 **영영 주입되지 않는다**.

**증거** (합성 이벤트, cwd=ogham 루트, 동일 세션):

| 순서 | Read 대상                                              | 결과                                                            |
| ---- | ------------------------------------------------------ | --------------------------------------------------------------- |
| B1   | `plugins/filid/src/index.ts`                           | `[filid:guide]` + `[filid:ctx]`(src/INTENT.md 인라인) ✓         |
| B2   | `plugins/cennad/src/index.ts` (cennad **최초** 방문)   | **`[filid:map] src/*` 한 줄뿐** — cennad의 src/INTENT.md 미주입 |
| B3   | `plugins/filid/CLAUDE.md`                              | `[filid:ctx]`(filid 루트 INTENT 인라인) ✓                       |
| B4   | `plugins/cennad/CLAUDE.md` (cennad 루트 **최초** 방문) | **`[filid:map] src,./*` 한 줄뿐** — cennad 루트 INTENT 미주입   |

**원인**: fmap은 프로세스 cwd 단위 단일 파일인데(`fmap-<sessionHash>.json`), 방문 키 `relDir`는 **각 파일의 boundary(가장 가까운 package.json) 기준 상대경로**다 (`src/hooks/preToolUse/helpers/intentInjector/intentInjector.ts:79` `path.relative(boundary, fileDir)`). `plugins/filid/src`와 `plugins/cennad/src`가 똑같이 `"src"`로 축약되어 두 번째 방문이 "이미 방문"으로 처리된다 (`intentInjector.ts:85` `isFirstVisit` 판정).

**영향**: ogham처럼 6개 패키지 모노레포에서 한 턴에 여러 패키지를 오가는 작업(크로스 패키지 리팩토링, 공유 패키지 소비처 수정)일수록 **경계 규칙이 안 보이는 패키지**가 생긴다. 심지어 map 표기(`./*`, `src`)는 이미 그 컨텍스트를 받은 것처럼 보여 Claude가 결핍을 인지할 수도 없다.

**개선 방향**: fmap 키를 boundary-상대경로가 아니라 **boundary 절대경로 + relDir 복합키**(또는 cwd-상대 전체 경로)로 저장하고, map 표시만 축약한다. 표시 시에도 서로 다른 boundary가 섞이면 boundary 프리픽스를 남겨 구분한다.

### F2. structure-guard의 절대경로 세그먼트 오처리 — 구조 검사 무력화 + 상시 오경보 【높음】

**현상 1** (G1): `plugins/filid/src/hooks/probe/probe.ts` Write 시 →
`[filid:warn] structure-guard: 1. Attempting to create a subdirectory inside organ directory "hooks"...`
그러나 `src/hooks`는 INTENT.md를 가진 **fractal**이다(플러그인 자신의 훅 계층). 사용자 메모리에도 "알려진 false positive"로 기록되어 있던 그 경보다.

**현상 2** (C2/C5 부수 관찰): 스크래치 픽스처(`.../hookprobe/fixtures/fcaproj/...`)에 INTENT.md를 Write하자 `"fixtures" has been reclassified from organ to fractal...` — **cwd 바깥 조상 경로 조각**(`fixtures`)에 대한 진단이 출력됐다.

**원인 (연쇄)**:

1. `src/hooks/utils/getParentSegments.ts:1-5` — 파일명만 제거한 **절대경로 전체 세그먼트**를 반환 (`['Users','Vincent','Workspace','ogham','plugins','filid','src','hooks','probe']`).
2. `checkOrganSubdirectory.ts:13-14` / `checkIntentMdReclassification.ts:19-21` — 그 세그먼트를 **cwd에 다시 누적 join** → `/Users/Vincent/Workspace/ogham/Users/Vincent/...` 같은 **존재하지 않는 경로** 생성.
3. `organStructureChecker.ts:31-33` — 경로가 없으면 `KNOWN_ORGAN_DIR_NAMES` **이름 폴백**으로 판정.

Claude Code는 Write/Edit에 항상 절대경로를 보내므로, **구조 기반 판정(INTENT.md 확인으로 organ 오판 교정)은 사실상 도달 불가능한 코드**가 되고, 절대경로 어딘가에 organ 이름(`hooks`, `lib`, `utils`, `fixtures`, `test`…)이 있기만 하면 경고가 난다. 반대로 **진짜 organ 내부에 서브디렉토리를 만드는 실제 위반**도 이름이 우연히 걸리지 않으면 잡지 못한다.

**영향**: (a) 該당 경로에서 매 Write마다 오경보가 컨텍스트에 쌓임(신뢰 저하 + 토큰), (b) 규칙 위반 실탐지 실패, (c) 프로젝트 밖 경로 조각에 대한 진단이라는 그 자체로 이상한 메시지.

**개선 방향**: `getParentSegments`를 **cwd(또는 boundary) 상대 세그먼트**로 바꾸거나, 검사기가 `path.resolve(cwd, filePath)`의 실제 디렉토리 체인을 직접 walk하도록 수정. 프로젝트 경계 밖 세그먼트는 검사 대상에서 제외.

### F3. fmap 동시 쓰기 유실 — 병렬 Read 배치에서 방문 기록 소실 【중간】

**증거**: 동일 세션에서 6개 디렉토리 최초 방문 Read를 동시에 발사한 뒤 후속 Read의 map을 검사 — 5회 반복 중 1회에서 `LOST core,ast,metrics,compress,lib | map=[filid:map] src/{types,*}` (6건 중 5건 유실).

**원인**: 훅은 이벤트마다 별도 프로세스로 뜨고, `readFractalMap` → 메모리 수정 → `writeFractalMap`(`writeFileSync` 직접, 잠금·tmp+rename 없음: `caches/writeFractalMap.ts:19`)의 read-modify-write가 겹치면 마지막 쓰기가 이긴다.

**영향**: Claude는 독립 Read를 **한 응답에 병렬 배치**하는 것이 기본 동작이므로 발생 빈도가 낮지 않다. 유실된 디렉토리는 다음 접근에서 ctx가 **중복 재주입**되고(토큰), map 표기가 실제 방문 이력과 어긋난다. 컨텍스트 손실은 아님(각 프로세스가 자기 ctx는 이미 반환).

**개선 방향**: tmp 파일 + `rename` 원자 교체, 또는 append 전용 JSONL(방문 이벤트 로그)로 바꾸고 읽기 시 머지. per-이벤트 파일 락도 가능하나 훅 레이턴시 예산(75ms) 고려 시 rename이 적정.

### F4. Phase D가 은퇴한 팀 API를 참조 — cross-review/pipeline의 지시 실행 불가 【높음】

**현상**: `skills/cross-review/SKILL.md`(31, 35, 210, 258, 298, 304행)와 `skills/pipeline/SKILL.md`(Phase D Dispatch 절)는 `TeamCreate(review-<branch>)`, `TeamDelete`, persona별 `Task(...)` 호출을 규정한다.

**증거 (실측)**: 현 세션 도구 표면에서 ToolSearch(`+team create delete`) 결과 `TeamCreate`/`TeamDelete` **부재**. 스폰 도구는 `Task`가 아니라 `Agent`이며, `Agent`의 `team_name` 파라미터는 "**Deprecated; ignored. The session has a single implicit team.**"으로 명시되어 있다 — 팀 명시 생성/삭제 API 자체가 은퇴했다.

**맥락**: `.filid/review/maencof--kg_search/`에 6/30자 Phase D 라운드 산출물(`rounds/round-1-<persona>.md` 등)이 완비되어 있어 **과거에는 완주**했다. 즉 이는 회귀가 아니라 **호스트 API 드리프트**다. 지금 Claude가 이 스킬을 실행하면 존재하지 않는 도구를 찾다가 임기응변(Agent로 대체)하게 되는데, 스킬 자신이 "지시 밖 행동은 protocol violation"이라 규정하므로(예: `chairperson-direct` 금지) **지시 준수와 실행 가능성이 충돌**한다. `TeamDelete inside try/finally` 같은 계약은 이행 자체가 불가능하다.

**영향**: pipeline의 review 단계(팀 모드)가 가장 복잡한 경로에서 지시-현실 불일치로 스톨/변칙 실행 위험. solo-adjudicator 경로는 `Task(filid:adjudicator)` 명칭 드리프트(→`Agent`)만 수정하면 됨.

**개선 방향**: Phase D 문서를 현행 표면으로 재작성 — `Agent`(named teammates, implicit team) + `SendMessage` + `TaskCreate/TaskUpdate` 기반으로 라운드 상태 머신을 재기술하고, `TeamCreate/TeamDelete` 언급을 제거(teardown은 자연 종료/TaskStop으로 대체). "Task" 단어는 스폰 의미로는 `Agent`로 통일.

### F5. SubagentStart 역할 제약 키 불일치 — filid 자체 에이전트에 제약 미주입 【중간】

**증거 (핸들러 레벨)**: `bridge/agent-enforcer.mjs`에 합성 이벤트 주입 —

| agent_type                       | 결과                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `qa-reviewer` (bare)             | `ROLE RESTRICTION: ... MUST NOT use Write, Edit, or Bash ...` + `[filid:lang]` 주입 ✓ |
| `filid:qa-reviewer` (namespaced) | **`{"continue":true}` — 아무것도 미주입**                                             |
| `oh-my-claudecode:planner`       | PLANNING_GUIDANCE ✓                                                                   |
| `general-purpose`                | IMPLEMENTATION_REMINDER ✓                                                             |

**비대칭의 근거**: `src/constants/agentContext.ts:1-30`의 `ROLE_RESTRICTIONS` 키는 전부 bare(`'qa-reviewer'` 등)인데, 같은 파일 48–50행의 OMC 정규식은 **네임스페이스 형태**(`^oh-my-claudecode:planner$`)다. 그리고 스킬들은 일관되게 네임스페이스 형태로 스폰을 지시한다(`resolve/SKILL.md:151` `subagent_type: "filid:code-surgeon"`, `cross-review/contracts.md:30` `Task(subagent_type: filid:<id>)` 등 — 전수 grep 결과 bare 스폰 지시는 없음).

**라이브 프로브 (판정 한계 명시)**: 실제 `filid:qa-reviewer`·`general-purpose` 서브에이전트를 스폰해 주입 문자열 회수를 시도했으나, 프로브 에이전트가 세션 예산 내에 회신하지 않아 **전달 문자열의 직접 캡처는 미완**이다. 다만 (a) `Agent` 도구의 스폰 파라미터 자체가 네임스페이스 형태(`subagent_type: "filid:qa-reviewer"`)이고, (b) 같은 상수 파일의 OMC 정규식이 네임스페이스 전달을 전제하며, (c) 핸들러는 bare 키 정확 일치만 수행함이 실측됐으므로, filid 에이전트의 프롬프트-레벨 역할 제약은 미발화일 개연성이 높다. 확정에는 라이브 캡처 1회면 충분하다(부록 A의 F5 재현 절차).

**완충 요인**: 각 에이전트 .md의 `tools:` 허용목록(예: qa-reviewer는 `Read, Glob, Grep`)이 하드 제약으로 남아 있어 실질 방어선은 유지된다. 따라서 심각도는 중간.

**개선 방향**: `ROLE_RESTRICTIONS` 조회를 `agentType.replace(/^filid:/, '')` 정규화 후 수행하거나, 키를 bare+namespaced 양쪽으로 등록.

### F6. fractal_scan 결과 과대 — 도구 결과 캡 초과로 scan 스킬 Phase 1 가정 붕괴 【높음】

**증거 (실 호출)**:

- `fractal_scan(path=plugins/filid, depth=4)` → **72,601자 단일 라인** → "exceeds maximum allowed tokens" → 결과가 컨텍스트 대신 **파일로 우회**됨.
- `fractal_scan(path=ogham 루트, depth=6)` → **412,900자** → 동일 우회.

**충돌 지점**: `skills/scan/SKILL.md:61-68`은 "fractal_scan은 ≥50KB를 반환하니 **응답을 내부 작업 데이터로 취급**해 세 작업 집합을 추출하고 같은 응답에서 Phase 2–4로 진행하라"고 지시한다. 그러나 결과가 캡을 넘으면 **애초에 컨텍스트에 없으므로** "추출"이 불가능하고, Claude는 80,000자 단위 슬라이스 같은 우회 작업을 즉흥해야 한다. `scan/reference.md:11`은 `depth` 없이 호출하라고 해 상황을 악화시킨다. guide 등 fractal_scan을 쓰는 다른 스킬도 동일 노출.

**개선 방향**: (a) 도구에 `summary`/`paths-only` 모드나 페이지네이션 추가, (b) 결과를 서버가 `.filid/scan-report.json`에 쓰고 요약+경로만 반환하는 계약으로 전환, (c) 스킬 문서에 "캡 초과 시 파일 우회 → grep 순회" 표준 절차 명기. (a)+(b) 병행이 이상적.

### F7. fractal_navigate classify — `entries: []`에서 INTENT.md 보유 fractal을 organ으로 오판 【중간】

**증거 (실 호출)**: `fractal_navigate(action: "classify", path: ".../plugins/filid/src/hooks", entries: [])` → `{"classification":"organ"}`. 해당 디렉토리는 INTENT.md를 가진 fractal이다. 참고로 `entries` 자체가 required여서(`createServer.ts:64`) 생략하면 `Input validation error: ... "entries" Required`.

**원인**: `handleClassify.ts:23` — `hasIntentMd = entry?.hasIntentMd ?? false`. 핸들러는 **파일시스템을 전혀 확인하지 않고** 호출자가 넣어준 entries에만 의존한다. 자연스러운 최소 호출(빈 배열)이 곧 garbage-in → **silent garbage-out**. classifyNode 자체(`organClassifier.ts:54`)는 INTENT.md 최우선으로 올바르다 — 입력이 거짓일 뿐이다.

**영향**: 스킬/에이전트가 classify를 신뢰하면 fractal을 organ으로 취급하는 후속 판단(INTENT 금지, flat 유지 등)이 연쇄로 오염된다.

**개선 방향**: classify 액션에서 대상 경로의 INTENT.md/DETAIL.md를 핸들러가 직접 `existsSync`로 확인(우선), entries는 tree 구성 전용으로 남기고 classify에선 optional화. 최소한 "entries에 대상 경로 항목이 없으면 error 반환"으로 침묵 오판 제거.

### F8. 빈 내용 INTENT.md Write는 검증 우회 【낮음】

**증거** (C2): `Write(INTENT.md, content: "")` → deny 없음(structure-guard 잡음만). 원인: `preToolValidator.ts:253`의 `if (input.tool_name !== 'Write' || !content) return { continue: true }` — falsy content 단락이 `validateIntentMd`(3-tier 필수 섹션 검사)보다 먼저 온다. criteria.md에는 같은 클래스의 우회를 막는 주석·처리가 있으나("empty-content Write is the trivial full-wipe... validate it too", `preToolValidator.ts:234-240`) INTENT.md에는 없다.

**영향**: 빈 파일 생성 후 20줄 이하 Edit 반복으로 3-tier 검증을 영영 안 받는 INTENT.md가 가능. 후속 `/filid:scan`이 잡아주므로 실질 위험은 낮음.

**개선 방향**: INTENT.md 대상 Write는 빈 내용도 `validateIntentMd`에 통과시키기 (criteria와 동일 원칙).

### F9. 비-FCA 프로젝트에도 문서 계약 deny 적용 【중간】

**증거** (C5): `.filid`도 INTENT.md도 없는 순수 프로젝트(`.git`만 존재)에서 60줄 INTENT.md Write → **deny** (`INTENT.md write rejected: INTENT.md exceeds 50-line limit (60 lines)...`). structure-guard 잡음도 함께 출력.

**원인**: `injectIntent`(`isFcaProject` 게이트 있음)·`userPromptSubmit`(게이트 있음)과 달리 `validatePreToolUse`/`guardStructure`는 `validateCwd`만 확인한다 (`preToolValidator.ts:223-224`).

**영향**: 플러그인이 user 스코프로 설치돼 있으면 **FCA를 채택한 적 없는 저장소**에서도 `INTENT.md`/`DETAIL.md`라는 파일명을 쓰는 순간 filid 규칙이 강제된다. 다른 컨벤션으로 50줄 넘는 INTENT.md를 쓰는 프로젝트는 이유 모를 차단을 겪는다. setup 훅의 자동 `.filid/` 마커 생성(INTENT.md 발견 시)과 결합하면 "조용한 편입"의 체감이 더 커진다.

**개선 방향**: Write/Edit 검증 경로에도 `isFcaProject` 게이트를 추가해 opt-in 원칙을 훅 전체에 일관 적용.

### F10. `unread-intent` 도달 불가 + 가이드 문구 부정확 + 주입 범위 문서-코드 불일치 【낮음】

세 가지가 하나의 계약 흐트러짐으로 묶인다:

1. **죽은 신호**: `[filid:guide]`는 `unread-intent: directories with INTENT.md not yet surfaced — read their INTENT.md before modifying`을 약속하지만, fmap의 유일한 생산자인 intentInjector는 **Read에서만** 호출되고(`preToolUse.ts:35`) `reads`에 넣는 디렉토리를 항상 `intents`에도 넣는다(fast path는 `intents` 멤버십이 전제, slow path는 `intents.push` — `intentInjector.ts:56, 91`). 따라서 `buildMapBlock.ts:13-15`의 `reads − intents − {current}`는 **항상 공집합** — 전체 프로브에서도 단 한 번도 출현하지 않았다. Write가 fmap에 기록되지 않으므로 "읽지 않고 수정한 디렉토리"라는 본래 의도를 실현할 데이터가 없다.
2. **문구 부정확**: guide는 `/* = current working directory`라 하지만 실제 `*`는 **현재 접근한 파일의 boundary-상대 디렉토리**다(`compressPaths.ts:49`; 실측 map에서 `src/hooks/preToolUse/*` 등으로 확인). 또 "visited directories **this session**"이라 하지만 fmap은 **매 사용자 프롬프트마다 리셋**된다(`userPromptSubmit.ts:28` `removeFractalMap`) — 실제 의미는 "이번 턴".
3. **주입 범위 불일치**: `intentInjector.ts` JSDoc과 그 INTENT.md는 "PreToolUse(Read|Write|Edit)에서 주입"이라 기술하지만 오케스트레이터는 Read에만 배선했다. 결과적으로 **한 번도 읽지 않은 모듈에 바로 Write하는 흐름에서는 경계 규칙이 전혀 노출되지 않는다** — F1과 함께, "수정 전 INTENT를 보게 한다"는 플러그인의 핵심 약속이 빠지는 두 경로다.

**개선 방향**: (1) Write/Edit도 방문 기록(최소한 `reads`)에 남겨 unread-intent를 실동작시키거나, 기능·문구를 함께 제거. (2) guide 문구를 실semantics로 수정("`*` = 방금 접근한 디렉토리", "이번 턴 방문 목록"). (3) 주입 범위를 코드에 맞춰 문서 수정하거나, Write/Edit 최초 방문에도 ctx 주입(후자가 F10-3과 F1의 취지에 부합).

---

## 5. 오해로 판명 (REFUTED) · 정상 확인 (VERIFIED)

사전 심증 중 실측으로 **반증**된 것:

| #   | 심증                                                                 | 판정 근거                                                                                                                             |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | "MCP 도구 등록/이름이 스킬 참조와 어긋날 것"                         | 서버 등록 18종 = 세션 노출 18종 = 스킬 전수 grep 참조 18종 완전 일치, 전부 full-form(`mcp__plugin_filid_t__*`), short-form·오탈자 0건 |
| R2  | "훅 spawn 오버헤드가 도구 호출을 지연시킬 것"                        | 중앙값 75ms(Read)/74ms(Write)/71ms(enforcer), 최대 80ms — 10s 타임아웃 대비 무시 가능                                                 |
| R3  | "changeTracker는 잊힌 죽은 코드"                                     | `@deprecated` JSDoc + INTENT.md에 의도적 비활성·재활성 조건 명시(프로세스-간 큐 부재) — 관리되는 비활성                               |
| R4  | "매처 `Read\|Write\|Edit`의 부분일치(NotebookEdit 등)가 오동작 유발" | C7: `NotebookEdit` 페이로드 → `{continue: true}` no-op, 부작용 없음 (75ms 낭비만)                                                     |
| R5  | "hook 번들이 크기 예산을 초과했을 것(15KB 메모)"                     | 티어별 캡으로 관리됨(`build-hooks.mjs` per-hook caps) + 전체 빌드/테스트 통과                                                         |

설계 의도대로 **정상 동작**을 확인한 것:

| #   | 항목                                                                                                                                                                                     | 증거                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| V1  | INTENT.md 50줄 캡 — Write 및 **Edit 시뮬레이션**(old_string 치환 투영) 모두 정확히 deny                                                                                                  | C1(60줄 Write deny), C4(48→53줄 Edit deny)                                                |
| V2  | DETAIL.md append-only 차단 (날짜 헤더 append 시 rewrite 유도 deny)                                                                                                                       | C6                                                                                        |
| V3  | 세션 첫 프롬프트 포인터 게이트(1회) · 턴 단위 ctx 재주입 · 재방문 map-only                                                                                                               | F1–F5 프로브 시퀀스                                                                       |
| V4  | criteria.md 원장 배선(빈 내용 Write도 검증) 및 documentValidator 로직                                                                                                                    | 단위 스위트 + C6 경로로 배선 확인                                                         |
| V5  | `libs/run.cjs` 러너 견고성(스테일 플러그인 루트 폴백, execPath 스폰, 실패 시 훅 비차단)                                                                                                  | 코드 검토                                                                                 |
| V6  | pipeline이 참조하는 `review_manage` 액션(`normalize-branch`/`content-hash`/`format-pr-comment`)·`cache_manage` 액션 모두 스키마 enum에 실재                                              | `createServer.ts` 대조                                                                    |
| V7  | deny 시 `permissionDecisionReason`에 재시도 가이드 포함, 이유 없는 deny 방지 폴백                                                                                                        | `mergeResults.ts:36-39` + C1/C4/C5 출력                                                   |
| V8  | **spike 모드 게이트** — spike/\* 브랜치에서 `[filid:spike]` 배너 매 프롬프트 방출 + INTENT 50줄 deny 면제(동일 60줄 Write가 main에선 C1 deny, spike에선 통과), criteria 원장은 유지 명시 | spikeprobe (합성 `.git/HEAD` = `spike/probe`) — reflog 부재 시 "day ?" 우아한 강등도 확인 |

**미실측(UNTESTED)으로 남긴 것**: harvest 인터뷰 흐름(상호작용 게이트), `/filid:pipeline` 전 구간 라이브 완주(외부 PR·비용 필요 — 단 Phase D 계약 불일치는 F4로 실측).

---

## 6. 설계 마찰 (오작동은 아니나 어색하거나 비용이 큰 지점)

| #   | 마찰                                                                                                                                                                                                                                                                                          | 관찰                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| D1  | **턴마다 전체 재주입 토큰 비용** — fmap을 매 프롬프트 리셋하므로 긴 세션에서 같은 INTENT.md(≤50줄 ≈ 400~600토큰)가 턴×모듈 수만큼 반복 인라인된다. 컴팩션 대비 신선도는 얻지만 비용이 크다                                                                                                    | F4 프로브: 프롬프트 직후 동일 파일 Read에 ctx 전문 재주입 확인 |
| D2  | **서브에이전트마다 guide+ctx 독립 재주입** — 캐시 디렉토리에 서브에이전트 세션별 `fmap-*`/`guide-*` 파일 생성 확인. 에이전트 다수 스폰 시 배수 비용                                                                                                                                           | 세션 캐시 디렉토리 실관찰                                      |
| D3  | **null 허용 비일관** — `rule_docs_sync`만 LLM의 `null` 방출 대응(`nullish`, 작성자 주석이 실사고 명시)이고 나머지 17개 도구의 `.optional()`은 null 거부. 같은 사고가 다른 도구에서 재발 가능                                                                                                  | `createServer.ts:166-174` 주석 vs 타 스키마                    |
| D4  | **required 과다 스키마** — `fractal_navigate.entries`(F7), `debt_manage.debts[].weight/touch_count` 등 LLM 호출자가 채우기 버거운 필수 중첩 필드                                                                                                                                              | 스키마 검토 + F7 실측                                          |
| D5  | **boilerplate INTENT.md 주입** — mcp/tools 하위 다수 INTENT.md가 "Purpose: 프랙탈 트리 탐색 도구." 수준의 무정보 본문이라 ctx 주입이 토큰만 소비 (`/filid:enrich-docs`의 존재 이유)                                                                                                           | fractalNavigate/serverEntry 등 주입 실관찰                     |
| D6  | **skills/INTENT.md의 등록 지침 불일치** — "Always do: plugin.json에 스킬 등록 추가"라지만 실제 plugin.json은 `"skills": "./skills/"` 디렉토리 자동 등록                                                                                                                                       | plugin.json 대조                                               |
| D7  | **도그푸딩 노이즈** — `structure_validate(plugins/filid)` 결과 노드 33개 실패, 전부 warning: 플러그인 자신의 컨벤션(`*.entry.ts` 훅 엔트리, organ식 1함수-1파일 헬퍼 디렉토리에 INTENT.md 부여)이 자기 규칙(zero-peer-file, module-entry-point)과 충돌. 규칙 출력의 신호 대 잡음비를 떨어뜨림 | 실 호출 결과                                                   |
| D8  | **조용한 편입** — setup 훅이 depth≤4에서 INTENT.md 발견 시 무통보로 `.filid/` 마커 생성 → 이후 모든 주입·검증 활성화. F9와 결합 시 "설치만 했는데 다른 레포가 통제됨" 체감                                                                                                                    | `setup.ts:51-58`                                               |
| D9  | **`[filid:map]` 압축 표기 해독 비용** — `src/{hooks/{preToolUse/{helpers/{...}}}}` 중첩 brace가 깊어지면 LLM이 오독할 여지. F10-2 문구 문제와 결합                                                                                                                                            | 본 세션 실주입 관찰                                            |

---

## 7. 스킬·에이전트 교차참조 감사

주요 결과 (19개 스킬 + 14개 에이전트 대상 전수 grep 직접 검증; 병렬 감사 에이전트도 가동했으나 세션 예산 내 미회신하여 직접 검증분만 기재):

- **MCP 참조**: 19개 스킬 전체에서 full-form 18종만 사용, 실재하지 않는 도구 참조 0건 (R1).
- **Skill() 체인**: `filid:cross-review/harvest/promote/pull-request/resolve/restructure/revalidate/update` — 전부 실재. `pipeline`의 `pr-create`/`review`는 **스테이지 별칭**이며 `stages.md`가 SSoT로 명시 (혼동 방지 장치 존재 — 양호).
- **서브에이전트 스폰 문자열**: 전부 `filid:*` 네임스페이스 형태 또는 `general-purpose` — 정의 파일 존재와 대응. 단 F5(제약 키 불일치)와 F4(`Task(...)` 표기)가 이 위에 걸쳐 있음.
- **에이전트 정의**: frontmatter `tools:` 허용목록이 역할 제약 텍스트와 방향 일치(예: qa-reviewer = Read/Glob/Grep). 하드 방어선 유지 확인.

(병렬 감사 에이전트의 세부 표는 부록 B에 통합.)

---

## 8. 개선 방향 제안 (우선순위)

수정은 수행하지 않았다. 착수 순서 제안:

**P0 — 흐름 단절/오작동 직결**

1. **F1**: fmap 방문 키를 boundary 절대경로 복합키로 (모노레포는 filid의 1차 사용 환경).
2. **F2**: `getParentSegments`를 cwd-상대화(또는 실경로 walk)로 교정 — 오경보 제거와 실탐지 복원을 동시에.
3. **F4**: cross-review/pipeline Phase D를 현행 `Agent`/implicit-team/`SendMessage` 표면으로 재작성.

**P1 — 도구 계약 신뢰성** 4. **F6**: fractal_scan에 summary/페이지네이션 모드 또는 파일-출력 계약 추가 + scan/guide 스킬 문서 동기화 (도구 계약 변경 시 소비처 전수 교차검증 원칙 적용). 5. **F7**: classify가 fs를 직접 확인하도록; entries는 tree 전용으로. 6. **F5**: enforcer 키 정규화(`filid:` 프리픽스 strip) — 1줄 수준.

**P2 — 위생·일관성** 7. **F3**: fmap tmp+rename 원자 쓰기. 8. **F9**: Write/Edit 검증 경로에 `isFcaProject` 게이트. 9. **F8**: 빈 INTENT.md Write도 검증. 10. **F10**: guide 문구 실semantics화 + unread-intent 실동작(Write 기록) 또는 제거 + intentInjector 문서-코드 일치.

**P3 — 마찰 완화(선택)** 11. D1/D2: 재주입 정책 옵션화(예: 턴 리셋 대신 N턴/컴팩션 시점 리셋), ctx 요약 모드. 12. D3/D4: 전 도구 스키마 nullish 일관화 + required 최소화 패스. 13. D7: 자기 저장소 예외 규칙(`additional-allowed`에 `*.entry.ts` 패턴 등) 정비로 도그푸딩 잡음 제거.

---

## 부록 A. 재현 방법

하네스는 세션 스크래치(`<scratchpad>/hookprobe/`)의 `runner.mjs`(B/A/C/F/G/H 케이스), `raceprobe.mjs`(경합), `timeprobe.mjs`(레이턴시)로 실행했다. 스크래치는 휘발성이므로 핵심 페이로드 형태를 남긴다 — bridge는 stdin JSON 하나로 구동되며 대상 파일을 변형하지 않는다:

```bash
node plugins/filid/libs/run.cjs plugins/filid/bridge/pre-tool-use.mjs <<'JSON'
{"cwd":"/Users/Vincent/Workspace/ogham","session_id":"probe-1","hook_event_name":"PreToolUse",
 "tool_name":"Read","tool_input":{"file_path":"/Users/Vincent/Workspace/ogham/plugins/cennad/src/index.ts"}}
JSON
```

- F1 재현: 같은 `session_id`로 `plugins/filid/src/index.ts` Read 후 `plugins/cennad/src/index.ts` Read — 두 번째 출력에 `[filid:ctx]` 부재.
- F5 재현: `bridge/agent-enforcer.mjs`에 `{"hook_event_name":"SubagentStart","agent_type":"filid:qa-reviewer",...}` vs bare `"qa-reviewer"`.
- F6 재현: `mcp__plugin_filid_t__fractal_scan {path: <repo>, depth: 4}` 직접 호출.
- F7 재현: `mcp__plugin_filid_t__fractal_navigate {action:"classify", path:".../src/hooks", entries: []}`.
- 합성 세션 캐시는 `bridge/session-cleanup.mjs`에 동일 `cwd`/`session_id`의 SessionEnd 이벤트를 보내 정리했다.

## 부록 B. 프로브 원시 결과 (발췌)

| ID    | 입력                               | 출력(요지)                                                                                                      |
| ----- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| B1    | Read filid/src/index.ts (최초)     | `[filid:guide]` + `[filid:ctx] src/index.ts` + INTENT 인라인 (+60줄)                                            |
| B2    | Read cennad/src/index.ts (최초)    | `{"continue":true,"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"[filid:map] src/*"}}` |
| B4    | Read cennad/CLAUDE.md (최초)       | `"additionalContext":"[filid:map] src,./*"`                                                                     |
| A1    | SubagentStart `qa-reviewer`        | `ROLE RESTRICTION: You are a QA/Reviewer agent. ...` + `[filid:lang] ko`                                        |
| A2    | SubagentStart `filid:qa-reviewer`  | `{"continue":true}` (무주입)                                                                                    |
| C1    | Write INTENT.md 60줄 (FCA)         | deny — `INTENT.md write rejected: ... exceeds 50-line limit (60 lines) ...`                                     |
| C2    | Write INTENT.md 빈 내용            | deny 없음 (structure-guard 잡음만)                                                                              |
| C4    | Edit INTENT.md 48→53줄             | deny — 투영 시뮬레이션 작동                                                                                     |
| C5    | Write INTENT.md 60줄 (**비-FCA**)  | deny — 동일 사유 (과잉 적용)                                                                                    |
| C6    | Write DETAIL.md(구본+append)       | deny — `DETAIL.md write rejected: ... never append ...`                                                         |
| C7    | NotebookEdit 페이로드              | `{"continue":true}` no-op                                                                                       |
| G1    | Write src/hooks/probe/probe.ts     | warn — `subdirectory inside organ directory "hooks"` (오경보)                                                   |
| F3→F4 | UserPromptSubmit 후 동일 Read      | 포인터 3줄(첫 프롬프트만) → ctx 전문 재주입                                                                     |
| H/R   | 6 동시 최초 방문 ×5회              | 1회 유실: `LOST core,ast,metrics,compress,lib                                                                   | map=[filid:map] src/{types,\*}` |
| T     | 레이턴시 6회 중앙값                | Read 75ms / Write 74ms / enforcer 71ms                                                                          |
| MCP   | fractal_scan filid(d4) / ogham(d6) | 72,601자 / 412,900자 — 캡 초과 파일 우회                                                                        |
| MCP   | classify src/hooks entries:[]      | `{"classification":"organ"}` (오판)                                                                             |
| MCP   | structure_validate plugins/filid   | passed 1303 / **failed 33** (전부 warning; entry.ts·헬퍼 파일 자기충돌)                                         |

## 부록 C. 참조 위치 (근본 원인 앵커)

- `src/hooks/preToolUse/preToolUse.ts:35` — intent 주입 Read 한정
- `src/hooks/preToolUse/helpers/intentInjector/intentInjector.ts:53-58, 79, 83-91` — relDir 키·최초방문 판정 (F1)
- `src/hooks/utils/getParentSegments.ts:1-5` + `checkOrganSubdirectory.ts:13-20` + `organStructureChecker.ts:31-33` — F2 연쇄
- `src/core/infra/cacheManager/caches/writeFractalMap.ts:19` — 비원자 쓰기 (F3)
- `skills/cross-review/SKILL.md:31,35,210,258,298,304` · `skills/pipeline/SKILL.md` Phase D Dispatch — F4
- `src/constants/agentContext.ts:1-30 vs 48-50` — F5
- `skills/scan/SKILL.md:61-68` · `skills/scan/reference.md:11` — F6
- `src/mcp/tools/fractalNavigate/utils/handleClassify.ts:23` · `src/mcp/server/createServer.ts:62-81` — F7
- `src/hooks/preToolUse/helpers/preToolValidator/preToolValidator.ts:253` (F8) · `:223-224` (F9)
- `src/constants/agentContext.ts:52-59`(GUIDE_BLOCK) · `buildMapBlock.ts:13-18` · `userPromptSubmit.ts:28` — F10
