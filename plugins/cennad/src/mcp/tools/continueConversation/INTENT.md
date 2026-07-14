## Purpose

기존 외부 LLM 세션을 이어 호출한다. cennad `session_id` 로 `SessionMeta` 를 찾고, dispatcher 의 `resume` 을 호출, `turn_count` 와 `last_used_at` 을 갱신.

## Structure

| File                      | Role                                                                      |
| ------------------------- | ------------------------------------------------------------------------- |
| `continueConversation.ts` | `handleContinueConversation` — project_hash 검증 → resume → 메타 업데이트 |
| `index.ts`                | barrel                                                                    |

## Conventions

- 입력 키 `snake_case`. `project_root` optional (절대경로) — Claude 는 생략 시 `process.cwd()`, 그 외 호스트는 생략하면 해석 실패로 거부
- 현재 프로젝트 루트의 `project_hash` 와 일치하지 않으면 `error.code='unknown'` 반환 (fallback 검색 금지). resume 의 spawn cwd 는 `SessionMeta.cwd` — `project_root` 는 세션 조회에만 쓰인다
- `provider` 카운터는 시도 기준 +1
- tier 우선순위: 명시 입력 → `SessionMeta.tier`(세션 시작 tier 복원) → `config.default_tier[provider]`(tier 미기록 legacy 세션만). tier 가 모델을 고르므로 복원하지 않으면 resume 중 모델이 갈린다(codex 가 경고). `options` 는 항상 `{}` 전달
- 권한 플래그는 매 호출 시 현재 `config.option_flags[provider]` 를 다시 읽어 `DispatchOptions.flags` 로 주입
- prompt 는 `composePrompt` 로 `config.preamble[session.provider]` + `config.recency_factor[session.provider]` 합성 후 dispatcher 에 전달; raw prompt 는 artifactWriter 에 별도 보존

## Boundaries

### Always do

- `getSession(projectHash, session_id)` 가 `null` → `error.code='unknown'` 즉시 반환
- 세션 provider 가 비활성(`ratio[provider].enabled=false`) → `error.code='disabled'` 즉시 반환 (resume·카운터 없음)
- resume 후 성공/실패 무관 `last_used_at`, `turn_count` 갱신 (호출 카운트 반영)
- dispatcher 가 반환한 `external_session_ref` 는 변경 없이 보존

### Ask first

- session 갱신 시점 변경 (현재는 성공/실패 모두 갱신)
- 다른 cwd 세션 자동 fallback 검색 활성화 (v1 비범위)

### Never do

- 다른 project_hash 의 세션을 탐색하거나 정정
- 세션 미발견 시 throw — 항상 envelope 로 정규화

## Dependencies

- `../../../core/sessionStore` — `getSession`, `updateSession`
- `../../../core/counterManager` — `incrementCounter`
- `../../../core/projectHash` — `getProjectHash`
- `@ogham/cross-platform/host-paths` — `projectRoot` (세션 조회용 프로젝트 루트 해석)
- `../../../dispatcher` — `dispatchers`, `buildResponse` (`envelope.js`)
- `../../../types` — `ConversationResponse`
- `../../../utils/isoNow.ts` — `isoNow`
- `node:perf_hooks` — `performance` (경과 시간 측정)
