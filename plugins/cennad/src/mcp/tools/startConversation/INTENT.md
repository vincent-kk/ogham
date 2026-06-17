## Purpose

새로운 외부 LLM 대화를 시작한다. cennad `session_id` (UUIDv4) 를 발급하고, dispatcher 를 통해 codex / gemini CLI 를 호출, 결과를 `ConversationResponse` 로 직조.

## Structure

| File                   | Role                                                               |
| ---------------------- | ------------------------------------------------------------------ |
| `startConversation.ts` | `handleStartConversation` — 입력 → dispatch → 세션 기록 → envelope |
| `index.ts`             | barrel                                                             |

## Conventions

- 입력 키는 `snake_case` 그대로 (외부 LLM 인터페이스)
- 외부 CLI 실패 시에도 `session_id` 디스크 기록 유지 (스펙)
- `provider` 카운터는 시도 기준 +1 (성공/실패 무관); 비활성 provider(`ratio[provider].enabled=false`)는 dispatch·기록·카운터 없이 `error.code='disabled'` 거부
- model 은 필수 입력 — 호출 측(Claude)이 작업 복잡도로 tier(high/mid/low)를 선택; 코드 fallback 없음
- 권한 플래그(`yolo`/`sandbox`/`sandbox_backend`)는 MCP input 미노출 — `config.option_flags[provider]` 에서만 결정
- dispatcher 에 `options` 는 항상 `{}` 로 전달 (MCP-facing layer 분리)
- prompt 는 `composePrompt` 로 `config.preamble[provider]` + `config.recency_factor[provider]` 합성 후 dispatcher 에 전달; raw prompt 는 artifactWriter 에 별도 보존

## Boundaries

### Always do

- `incrementCounter` 를 dispatch 호출 직전에 +1
- `createSession` 으로 디스크 메타 영속화
- dispatcher 응답의 `resolvedModel` 우선 저장 (없으면 alias)

### Ask first

- 입력 스키마에 새 키 추가
- 카운터 증가 시점 변경 (시도 기준 vs 성공 기준)

### Never do

- 다른 cwd 의 세션 조회 (이 도구는 항상 새 세션)
- dispatcher 결과를 직접 가공해 `error.code` 변경 — envelope 정규화는 dispatcher 책임

## Dependencies

- `../../../core/sessionStore` — `createSession` (세션 메타 영속화)
- `../../../core/counterManager` — `incrementCounter` (제공자별 호출 횟수 증가)
- `../../../core/projectHash` — cwd 기반 프로젝트 식별자
- `../../../core/configManager` — `loadConfig` (ratio/preamble/recency_factor/option_flags/artifacts 등 조회; `default_model` 없음 — `model` 은 필수 입력, `options` 는 항상 `{}`)
- `../../../dispatcher` — `dispatchers` (공급자별 CLI 호출), `buildResponse` (envelope 생성)
- `../../../types` — `ConversationResponse`, `Provider`, `ModelAlias`, `ConversationOptions`
- `../../../utils/isoNow.ts` — ISO 8601 타임스탬프 생성
- `zod` — 입력 스키마 검증 (MCP SDK 통해 적용)
