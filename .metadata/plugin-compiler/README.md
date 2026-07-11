# Plugin Compiler — 단일 정본에서 다중 호스트 플러그인 생성

> **Status: 보류 — 개발예정 (deferred).** 도구(`tools/plugin-compiler`)는 구현·커밋되었으나 마이그레이션(3-호스트 배포)은 착수하지 않기로 결정 — 빌드·CI 미배선. 경위·재개 트리거는 [migration-playbook-deferred.md](./migration-playbook-deferred.md). SessionEnd→MCP 수명주기 이관만 구현·채택 완료. 이 디렉터리는 설계 SSoT.
> 근거 이슈: [#78](https://github.com/vincent-kk/ogham/issues/78). 2026-07-11 로컬 실측(codex 0.144.1 · agy 1.1.1)으로 전면 갱신, 2026-07-12 보류 결정.

## 한 줄 요약

ogham 플러그인을 **하나의 호스트 중립 정본(IR)** 으로 기술하고, 빌드 시점에 **호스트별 배포 트리**(Claude Code · Codex · Antigravity · 향후 타 호스트)를 emit 하는 "플러그인 컴파일러"의 설계.

## 문제 정의

`plugins/*` 는 현재 Claude Code 전용이다. 실측 결과 Codex(`.codex-plugin/plugin.json` + 마켓플레이스)와 Antigravity(`agy plugin` — skills/agents/commands/mcpServers/hooks 5 컴포넌트)는 모두 플러그인 시스템을 갖추고 있고 Claude 와 개념적으로 1:1 에 가깝지만, **파일을 그대로 복사하는 드롭인은 불가**하다. 매니페스트 파일명·MCP 설정 파일명·경로 변수 전개·도구명 형식·훅 이벤트 어휘·stdin 계약이 서로 다르기 때문이다.

호스트별 포크는 런타임 로직과 워크플로 본문을 중복시켜 동기화 부담을 만든다. 그래서 **소스(정본) → 산출물(호스트별 플러그인) 분리**, 즉 컴파일러 접근을 택한다.

## 4 대 요구사항 (설계 제약)

1. **Claude Code 무결손** — 기존 플러그인의 동작 결손 전무. 기계적 보장: Stage 3 전환 시 `targets/claude/**` 가 현행 산출물과 **바이트 동일**해야 통과하는 게이트 ([compiler-architecture.md](./compiler-architecture.md) §6).
2. **신규/수정도 멀티 호스트** — `definitions/` 정본이 유일한 수정 지점. 빌드가 전 호스트 산출물을 재생성하므로 새 워크플로는 자동으로 전 호스트를 소화.
3. **설치 시 정본만 전달** — 세 호스트 모두 설치가 "디렉터리 통째 복사"(실측)이므로, 호스트별 배포 트리 `targets/<host>/` 를 분리하고 마켓플레이스가 그 경로를 가리킨다. 타 호스트 파일은 설치에 포함되지 않는다.
4. **Windows / POSIX 양립** — 훅·서버 진입은 항상 `node <script>` 직접 호출(쉘 스크립트 금지), 기존 `libs/run.cjs`(process.execPath 스폰) 유지, agy 는 `cmd /c` 자동 분기 확인. CI `windows-latest` 매트릭스로 검증.

## 핵심 결론 (실측 근거: [host-capability-matrix.md](./host-capability-matrix.md))

1. **런타임 로직(MCP 서버, hook 구현, src/bridge)은 호스트 중립** — 0 수정으로 전 호스트 공유. 훅 stdin 계약 차이는 러너 어댑터가 흡수.
2. **호스트 차이는 두 층**: **L1 스칼라**(도구명·호출구문·파일명·경로전략)는 변수 바인딩으로 완전 해결. **L2 구조**(Codex 플러그인 훅 부재·agents 번들 불가, agy 이벤트 어휘)는 emitter 분기·`fallback` 선언으로 빌드에 격리 — 단 **사라지지 않으며** 기능 손실 매트릭스로 고지한다 (matrix §7).
3. **실측이 설계를 두 곳에서 뒤집었다**: (a) Codex `.mcp.json` 은 Claude 와 같은 `mcpServers` 래퍼를 받지만 args 변수를 전개하지 않는다 → `cwd: "."` + 상대 경로 전략으로 해소. (b) Codex 플러그인 훅은 "SessionEnd 만 문제" 가 아니라 **전면 사용 불가**(`plugin_hooks`=removed, 선언 시 세션 행) → 전량 드롭 + 대체 채널.
4. **Antigravity 는 예상보다 가깝다**: skills/agents 는 Claude 형식 **무변환 수용**(실측), MCP 는 파일명만 다름, `agy plugin import claude` 호환 경로까지 제공. 훅만 별도 어휘(5 이벤트, camelCase, named-group).

## 커뮤니티 지형과 자체 컴파일러 채택 근거 (2026-07 조사)

같은 문제를 푸는 기존 해법의 지형 (웹 리서치, 상세 근거는 조사 보고 원문):

- **공용 표준 3층은 이미 이식됨** — AGENTS.md(지시문, Linux Foundation 거버넌스) · SKILL.md(Anthropic 발 오픈 표준, Codex 네이티브 채택 포함 40+ 에이전트) · MCP(도구 계층). ogham 스킬·MCP 서버가 표준 형태라 이 층은 변환 자체가 얇다.
- **single-source→멀티타깃 변환 도구 실존** — rulesync(1.2k★, rules·MCP·commands·subagents·skills·hooks 최광범위, Antigravity 타깃 포함, 매우 활발) · ruler(2.8k★) · agent_sync(저인지도, Antigravity 포함). 그 외 CC Suite(런타임 위임 브리지), Warp #12868(벤더 레벨 "호환 번들 shape" 제안), superpowers(호스트 매니페스트 co-locate).
- **채택하지 않고 자체 컴파일러를 만드는 근거**: 기존 도구는 설정·텍스트 계층 변환기다 — ogham 요구인 (a) 런타임 번들(bridge/·러너 어댑터) 포함 **자기완결 배포 트리**, (b) **Claude 바이트 동일성 게이트**, (c) 훅 stdin 계약·tool_name 역매핑 같은 **런타임 정밀 어댑테이션**, (d) 설치 격리를 다루지 않는다. 커뮤니티 평가로도 hooks 는 "이벤트 어휘가 에이전트별로 달라 자동 변환 충실도가 낮다"(무손실 미보장). 단 **rulesync/agent_sync 의 타깃별 산출물 스키마는 프로파일 작성 시 참조 자료**로 삼는다.
- co-locate 방식(superpowers)은 설치 시 모든 호스트 파일이 딸려가 요구 3(정본만 전달)과 충돌 — targets/ 분리가 우월.

## 목표 / 비목표

**목표**

- 기존 런타임 코드(src/·bridge/) 무수정 재사용.
- 워크플로 본문(skill)·페르소나(agent) 정본 1벌 유지, 호스트별 산출물 생성.
- 새 호스트 추가 = 새 프로파일 + emitter (O(1) 확장).
- 결정적·재현 가능한 빌드 (스냅샷 + Claude 동등성 게이트).
- 호스트별 자기완결 배포 트리 (설치 격리).

**비목표**

- "단일 바이트-동일 산출물" (호스트별 매니페스트는 본질적으로 갈라진다).
- 모든 기능의 100% 동등성 — 불가 항목은 기능 손실 매트릭스(matrix §7)로 명시하고 대체 채널을 제공.
- 런타임 동작의 호스트 추상화 (MCP 서버는 이미 중립이라 불필요).

## 문서 목차

**설계 (why/what)**

| 문서                                                     | 내용                                                                                            |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [host-capability-matrix.md](./host-capability-matrix.md) | 3-호스트 메커니즘 매핑, L1/L2 모델, 실측 확정값(도구명·cwd 전략·훅 계약), 기능 손실 매트릭스    |
| [ir-schema.md](./ir-schema.md)                           | 정본 IR 스키마 — `plugin.yaml`, skill 토큰 규약(3-호스트), agent `bundle`, hook `fallback` 어휘 |
| [compiler-architecture.md](./compiler-architecture.md)   | 파이프라인, 프로파일 3종, emitter, `targets/` 배포 트리, 훅 러너 어댑터, 검증(동등성 게이트·CI) |
| [case-studies.md](./case-studies.md)                     | deilen(L1) · filid/maencof(L2) · 로드맵 · 실측 게이트 결산(§D)                                  |
| [implementation-plan.md](./implementation-plan.md)       | 구현 착지본 — 패키지 위치·모듈 트리·IR 타입·단계 실행                                           |
| [sessionend-refactor.md](./sessionend-refactor.md)       | ADR — SessionEnd 제외 당위성 + 이전 방향 3옵션(shutdown·Stop수집·Finalizer) + 계층 채택 권장    |

**사용 (how) — 구현체는 [`tools/plugin-compiler/`](../../tools/plugin-compiler/)**

| 문서                                                               | 내용                                                                         |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [usage.md](./usage.md)                                             | 사용 가이드 — 정본 작성·CLI·토큰 규약·hook fallback·규칙 (다른 세션용)       |
| [reproduction.md](./reproduction.md)                               | 검증 재현 절차 (테스트 미커밋 — extract→compile→verify 로 재확인)            |
| [migration-playbook-deferred.md](./migration-playbook-deferred.md) | 재배치 플레이북(**보류**) — 보류 결정·재개 트리거·선결 함정 + Stage D 인프라 |

## 용어

- **정본 / IR**: 호스트 중립 플러그인 기술. `definitions/` 아래 위치.
- **호스트 프로파일**: 한 타깃 호스트의 규칙 집합 (도구명 포맷, 지원 이벤트, agent 전략, 경로 전략).
- **emitter**: 정본+프로파일 → 특정 산출물 생성기.
- **배포 트리 (`targets/<host>/`)**: 한 호스트에 설치되는 자기완결 디렉터리. 마켓플레이스가 가리키는 설치 단위.
- **러너 어댑터**: 훅 stdin/응답 계약을 호스트별로 정규화하는 `libs/run.cjs` 확장층.
- **스칼라 치환 / 구조 분기**: [host-capability-matrix.md](./host-capability-matrix.md) §2 의 2층 차이 모델.
