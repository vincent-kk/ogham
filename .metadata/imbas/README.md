# @ogham/imbas — Spec Index

Claude Code 플러그인. 기획 문서를 **재구조화·검증 → manday 추산 → 이슈 분할·생성 → 스캐폴드 PR**로 잇는 **순수 기획자(PM) 사이드** 파이프라인.

- 재구성 기준: 2026-08-05 (v2 — 개발자 사이드 제거 리팩토링)
- 구현 위치: `plugins/imbas/`
- 구 스펙: [official/](./official/)의 `BLUEPRINT-v1.md`·`specs-v1/` (2026-08-05 이관 완료)

## 핵심 결정

- **순수 기획자 사이드**: 코드베이스를 읽고 Subtask를 만드는 개발자 관점 기능(devplan·implement-plan·engineer·AST 도구)을 전부 제거. imbas의 산출물은 기획서·견적·이슈·PR 골격까지이며, 코드 구현 계획은 범위 밖.
- **4 기능 + 인프라**: refine(재구조화·검증) / estimate(manday 추산) / split(이슈 분할·생성) / scaffold-pr + setup. 주변 스킬 digest·status·pipeline 유지.
- **Provider 3종 유지**: `jira` / `github` / `local` — 구성 불변. Jira 실행은 imbas가 도구를 소유하지 않고 `[OP:]` 시맨틱 오퍼레이션(REST 의도)을 세션의 Atlassian 도구가 결의하는 방식.
- **MCP 9개**: 결정론적 상태머신(run 4종) + 매니페스트 스키마 검증(manifest 2종) + 설정(config 2종 + open_settings). 파일 I/O 래퍼·AST·캐시·ping 등 8개 제거.
- **Hook 0개**: 4개 lifecycle 훅 전부 제거 (전원 컨텍스트 주입용이었음 — 기능 손실 없음).
- **Agent 3개**: analyst · planner 유지, engineer 제거, **estimator 신규** (컨텍스트 heavy 추산 전담).
- **상태 이원화 유지**: phase 진행은 `state.json`(MCP 상태머신), 이슈 생성 진행은 매니페스트의 `issue_ref`/`status` 필드.

## 문서

| 파일                                 | 내용                                                              |
| ------------------------------------ | ----------------------------------------------------------------- |
| [spec.md](./spec.md)                 | 책임 분리(4 기능), 데이터 플로우, v1→v2 델타, 비채택 사항         |
| [architecture.md](./architecture.md) | 계층 구조, src 모듈 트리(축소 후), 빌드 파이프라인, provider 경계 |
| [skills.md](./skills.md)             | 스킬 9개(user 8 + internal 1) + 에이전트 3개 정의                 |
| [estimation.md](./estimation.md)     | estimate 스킬 심층 설계 — 3뷰 분해, PERT, 일정 산출               |
| [mcp-tools.md](./mcp-tools.md)       | MCP 도구 9개 정의 + 제거 8개 근거                                 |
| [storage.md](./storage.md)           | `.imbas/` 레이아웃, config 2계층, state·매니페스트 스키마         |
