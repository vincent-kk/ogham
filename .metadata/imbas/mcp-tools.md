# MCP Tools — 9개 (17 → 9)

서버명 `imbas` · 도구 접두사 `mcp__plugin_imbas_tools__` · 진입점 `bridge/mcp-server.cjs` (esbuild 번들, 원본 `src/mcp/`).

유지 기준: **결정론적 상태머신·스키마 검증·설정 계층은 코드가 소유한다.** 파일 I/O 래퍼는 Read/Write로 대체하고, 개발자 사이드 도구는 기능과 함께 제거한다.

## 1. 유지 (9)

### Run 상태머신 (4)

phase 집합이 `refine → estimate(skip 가능) → split`으로 재정의된다. 전이 규칙(순서·중복 방지·escape 코드)은 핸들러가 강제한다.

| 도구             | 역할                                              | 비고                                                                                                        |
| ---------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `run_create`     | run 디렉토리 + `state.json` 생성                  | source 스냅샷·run_id(`YYYYMMDD-NNN`) 발급                                                                   |
| `run_get`        | `state.json` 조회 (생략 시 최신 run)              | —                                                                                                           |
| `run_transition` | 타입 있는 전이 — start / complete / escape / skip | `skip`이 estimate 생략 경로. 통계 필드에 `estimated_manday` 추가, `stories_created` 유지, devplan 필드 제거 |
| `run_list`       | 프로젝트의 run 목록                               | status 스킬의 기반                                                                                          |

### Manifest 검증 (2)

| 도구                | 역할                                 | 비고                                                            |
| ------------------- | ------------------------------------ | --------------------------------------------------------------- |
| `manifest_save`     | Zod 스키마 검증 후 저장 (전체 교체)  | `type: "stories" \| "estimation"` — `manifest` 는 객체 또는 그 JSON 문자열 인코딩(object\|string 광고, 핸들러 해독) |
| `manifest_validate` | 저장된 매니페스트 재검증 (읽기 전용) | split 승인 게이트·pipeline 게이트의 근거                        |

### Config·Settings (3)

| 도구            | 역할                                               | 비고                                                                                               |
| --------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `config_get`    | 병합된 유효 설정 조회 (`field` 도트 경로 지원)     | user ← project 병합                                                                                |
| `config_set`    | 한 계층에 기록 — `scope: "user" \| "project"` 필수 | 계층 기본값 없음 (오기록 방지)                                                                     |
| `open_settings` | 127.0.0.1 설정 웹폼 + bounded long-poll            | estimation 계수 섹션 추가. `bootstrap`으로 세션 데이터(가용 provider·감지 repo·Jira 프로젝트) 주입 |

## 2. 제거 (8)

| 도구                         | 제거 근거                                                        | 대체                                                          |
| ---------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| `ping`                       | 헬스체크 — 실사용 없음                                           | 불필요                                                        |
| `manifest_get`               | 파일 읽기 + 요약 래퍼                                            | 스킬이 Read로 직접                                            |
| `manifest_plan`              | devplan 실행 계획 — 개발자 사이드                                | 소멸. stories 재개 필터링은 `status != "created"` 조회로 충분 |
| `manifest_implement_plan`    | 구현 DAG 배치 — 개발자 사이드                                    | 일정 산출은 estimate가 담당                                   |
| `cache_get` / `cache_set`    | 파일 I/O 래퍼                                                    | setup·read-issue가 `cache/*.json` Read/Write                  |
| `ast_search` / `ast_analyze` | 코드 분석 — 개발자 사이드. `@ast-grep/napi` 네이티브 의존성 제거 | 소멸 (engineer와 함께)                                        |

## 3. 파생 효과

- `src/ast/` 삭제, `src/core`의 executionPlanner·implementPlanner·cacheManager 삭제, types의 devplan·implement-plan·cache 스키마 삭제.
- 의존성에서 `@ast-grep/napi` 제거 — 플랫폼별 바이너리 문제 소멸.
- `.imbas/` 직접 편집을 안내하던 PreToolUse 훅은 MCP 축소·훅 제거 방침과 함께 소멸 — 스킬 문서가 "상태는 run/manifest 도구, 산출물 파일은 Read/Write" 규칙을 직접 기술한다.
