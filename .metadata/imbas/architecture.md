# Architecture — 계층 · 모듈 트리 · 빌드

## 1. 계층 구조

```
imbas (기획자 사이드 이슈 파이프라인)
├── Skills (9: user 8 + internal 1)
│    ├── Core:     refine, estimate, split
│    ├── Post:     scaffold-pr
│    ├── Orchestration: pipeline
│    ├── Infra:    setup, status
│    ├── Util:     digest
│    └── Internal: read-issue
├── Agents (3) — analyst · planner · estimator
├── MCP (9 tools) — run 4 · manifest 2 · config 2 · open_settings
├── Provider — jira([OP:] 시맨틱) · github(gh CLI) · local(마크다운)
├── State (.imbas/) — storage.md 참조
└── Hooks — 없음 (v2에서 계층 자체 소멸)
```

## 2. `[OP:]` 시맨틱 오퍼레이션 계층

- `skills/.shared/operations/<name>.md`가 Jira REST **의도**(endpoint·요청·응답 필드)를 정의한다. 도구 이름을 하드코딩하지 않는다.
- 스킬 워크플로우는 `[OP:create_issue]`처럼 의도를 참조하고, 실행 시점에 세션이 가진 Atlassian 도구(현재 `@ogham/atlassian`의 fetch/convert)가 이를 결의한다.
- 따라서 imbas는 Atlassian 자격 증명·전송 계층을 소유하지 않는다. Atlassian 플러그인이 없는 세션에서 jira provider를 쓰면 auth_check 단계에서 안내 후 중단한다.
- Confluence 계열 오퍼레이션(get/search_confluence)은 기획 문서를 Confluence URL로 받는 경로에서만 사용 — refine의 입력 로더.

## 3. `src/` 모듈 트리 (축소 후)

| Directory    | Role                                                                      | v2 변경                                                            |
| ------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `constants/` | 파일명·경로·파이프라인·에이전트 상수                                      | devplan·ast 상수 제거, estimation 추가                             |
| `types/`     | Zod 스키마 (config·state·manifest·estimation·settings)                    | devplan·implement-plan·cache 스키마 제거, estimation 신규          |
| `core/`      | stateManager · configManager · manifestValidator · runIdGenerator · paths | executionPlanner·implementPlanner·cacheManager·manifestParser 제거 |
| `mcp/`       | 서버 + 9개 도구 핸들러 + 설정 페이지 자산                                 | 도구 8개 제거                                                      |
| `lib/`       | logger · stdin · fileIo (atomic write)                                    | 유지                                                               |
| `providers/` | provider 파싱 로직 (github links 등)                                      | 유지                                                               |
| `utils/`     | 순수 유틸리티                                                             | 유지                                                               |
| ~~`ast/`~~   | —                                                                         | **삭제** (@ast-grep/napi 의존성과 함께)                            |
| ~~`hooks/`~~ | —                                                                         | **삭제** (훅 4종 소멸)                                             |

- 배송 진입점은 MCP 서버 하나: `mcp/serverEntry/serverEntry.ts` → `bridge/mcp-server.cjs`. 훅 번들(`bridge/*.mjs`)과 `libs/run.cjs`는 소멸.
- Zod 스키마는 `types/`가 단독 소유, 파일 쓰기는 `lib/fileIo` atomic write — v1 규칙 유지.

## 4. 빌드 파이프라인

```
clean → version:sync → build:pages(설정 HTML) → build:compile(tsc) → build:mcp(esbuild) → build:compile-plugin(plugin-compiler)
```

- v1 대비 `build:hooks` 단계 소멸. `buildHooks.mjs`·`hooks.json`(원본/생성 모두)·`libs/` 삭제.
- 산출물 커밋 정책 유지: `bridge/`(MCP 번들)·`public/`(설정 UI)는 빌드 후 커밋, 손편집 금지.
- `.codex-plugin/`은 plugin-compiler 재생성 — 스킬 개편 후 재실행으로 동기화.

## 5. 의존성

| 구분   | v2                                                                                          | v1에서 제거      |
| ------ | ------------------------------------------------------------------------------------------- | ---------------- |
| 런타임 | `@modelcontextprotocol/sdk ~1.22`, `zod ^3.23`                                              | `@ast-grep/napi` |
| 개발   | `@ogham/cross-platform`, `esbuild`, `typescript`, `vitest`, `@playwright/test`(설정 UI e2e) | —                |

## 6. Provider 경계 규칙 (유지)

- 스킬이 provider X를 실행할 때 `references/Y/**`를 읽지 않는다 — 공통 계약만 provider 중립 경로에.
- 신규 provider 추가는 ask-first.
- GitHub ref `owner/repo`는 디스크에서 `owner--repo`로 매핑.
