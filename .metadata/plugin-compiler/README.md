# Plugin Compiler — Claude 정본 + in-place 호스트 어댑터

> **Status: 채택 — in-place 어댑터 체제 (2026-07-14).** Claude 산출물이 정본이자 그대로 Claude 배포물이고, Codex·Antigravity 호환은 생성되는 소수의 어댑터 파일이 담당한다. 절차는 [migration-playbook.md](./migration-playbook.md), 도구는 [`tools/plugin-compiler`](../../tools/plugin-compiler/).
> 근거 이슈: [#78](https://github.com/vincent-kk/ogham/issues/78). 경위: 2026-07-11 실측(codex 0.144.1 — 플러그인 훅 불가)으로 `definitions/`→`targets/` 재배치 설계 후 **2026-07-12 보류**, 2026-07-14 재실측(codex 0.144.4 — 훅 지원 확정, ponytail 실증)으로 **in-place 어댑터로 전환·재개**. 구 재배치 설계·도구는 커밋 `6378169a` 이력 참조.

## 한 줄 요약

ogham 플러그인의 **Claude 산출물을 무수정 정본**으로 두고, `tools/plugin-compiler` 가 Codex(`.codex-plugin/plugin.json`)·Antigravity(`mcp_config.json`)·루트 마켓플레이스(`.agents/*`) 어댑터 파일을 **결정적으로 생성**해 한 저장소가 3-호스트에 설치되게 한다.

## 문제 정의

`plugins/*` 는 Claude Code 전용으로 작성됐다. 실측 결과 Codex 는 Claude 플러그인 형식(매니페스트 fallback·hooks 포맷·skills·마켓플레이스 fallback)을 거의 그대로 소비하고, agy 도 skills/agents/MCP 를 무변환 수용한다. 남는 실차이 — Codex MCP args 변수 미전개·서버명 스코프, agy MCP 파일명·훅 어휘 — 는 **파일 몇 개를 옆에 두는 것**으로 흡수된다. 호스트별 포크도, 배포 트리 분리도 불필요하다.

## 4 대 요구사항 (설계 제약)

1. **Claude Code 무결손** — 도구가 Claude 소비 파일을 일절 쓰지 않는다(생성 대상은 어댑터 4종뿐). 무결손이 게이트가 아니라 **구조로 보장**된다.
2. **신규/수정도 멀티 호스트** — Claude 산출물을 평소처럼 수정하고 `yarn plugin:adapters` 로 어댑터를 재생성하면 전 호스트가 따라온다.
3. **결정적 생성** — 동일 정본 → 동일 어댑터(바이트). `--check` 가 CI clean-regen 게이트.
4. **Windows / POSIX** — 훅/서버 진입은 `node <script>` 직접 호출 유지. Codex Windows 는 `commandWindows` 병기 여지(후속).

## 핵심 결론 (실측 근거: [host-capability-matrix.md](./host-capability-matrix.md))

1. **Codex 0.144.4 는 플러그인 훅을 정식 지원**한다 — Claude hooks.json 포맷·이벤트 표기·stdin/stdout 계약·exit 2 차단·matcher 의미론까지 호환 구현(소스 검증). `hooks/hooks.json` 한 파일을 Claude·Codex 가 공유한다(ponytail 패턴). ogham 훅 5종 플러그인의 사용 이벤트는 전부 지원 범위.
2. **Codex 는 `.claude-plugin/plugin.json`·marketplace.json 을 fallback 으로 읽는다** — 어댑터가 없어도 발견은 되나, `.codex-plugin/plugin.json` 을 두면 MCP 인라인 선언이 Claude 전용 `.mcp.json` 을 차폐한다(유일한 실질 비호환 지점의 단일 차단점).
3. **잔여 격차는 국소적**: Codex 는 agents 컴포넌트 부재·`Read` matcher 별칭 부재, agy 는 훅 어휘 상이(러너 어댑터 — 잔여 Stage). 기능 손실 매트릭스는 matrix §7.
4. 실측 게이트 G1–G6(Codex 도구명 스코프·exec 훅·재신뢰 UX·agy MCP 경로·agy 훅 오독·skill 도구명)은 [migration-playbook.md](./migration-playbook.md) 가 소유한다.

## 문서 목차

| 문서                                                     | 내용                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [host-capability-matrix.md](./host-capability-matrix.md) | 3-호스트 능력 매핑 — Codex 훅 계약(소스 확정)·MCP 전략·마켓플레이스 fallback·손실 매트릭스 |
| [compiler-architecture.md](./compiler-architecture.md)   | in-place 어댑터 아키텍처 — 파일 지형·생성 규칙·도구 구조·검증                              |
| [migration-playbook.md](./migration-playbook.md)         | 적용 절차 — 플러그인별 스텝·실측 게이트 G1–G8·롤아웃 순서·운영 규칙                        |
| [transition-plan.md](./transition-plan.md)               | **최종 전환 계획** — 게이트 종료 후 Phase A~E 실행 순서·의존성·완료 기준·사용자 고지 문안  |
| [TODO.md](./TODO.md)                                     | 인수인계 — 완료 상태 + 게이트 G1–G8 결과 요약                                              |
| [stage4-host-paths.md](./stage4-host-paths.md)           | **정본 수정 방향** — Codex MCP 의 경로 좌표 상실(G7): 왜 깨지는지·무엇을 고치는지·근거     |
| [sessionend-refactor.md](./sessionend-refactor.md)       | ADR — SessionEnd → MCP 수명주기 이관(완료·유지, 호스트 이벤트 채널 의존 제거)              |

사용법(CLI)은 [`tools/plugin-compiler/DETAIL.md`](../../tools/plugin-compiler/DETAIL.md) 가 소유한다. 구 체제 문서(ir-schema·case-studies·implementation-plan·reproduction·usage)는 재배치 설계와 함께 은퇴 — git 이력(`6378169a`) 참조.

## 용어

- **정본**: 각 플러그인의 현행 Claude 산출물(`.claude-plugin/`·`.mcp.json`·`skills/`·`agents/`·`hooks/`·`bridge/`·`libs/`). 사람이 수정하는 유일한 층.
- **어댑터**: 정본에서 생성되는 호스트 호환 파일 4종 — 플러그인별 `.codex-plugin/plugin.json`·`mcp_config.json`, 루트 `.agents/plugins/marketplace.json`·`.agents/plugins.json`. 손편집 금지.
- **게이트 (G1–G6)**: 실사용 전 실측으로 닫아야 하는 미확정 항목. 플레이북이 정의·추적.
- **러너 어댑터**: agy 훅 stdin/응답 계약을 Claude 계약으로 정규화하는 잔여 Stage 의 런타임 층(`libs/run.cjs` 확장).
