## Purpose

새로운 외부 LLM 대화를 시작한다. cogair `session_id` (UUIDv4) 를 발급하고, dispatcher 를 통해 codex / gemini CLI 를 호출, 결과를 `ConversationResponse` 로 직조.

## Structure

| File         | Role                                                               |
| ------------ | ------------------------------------------------------------------ |
| `handler.ts` | `handleStartConversation` — 입력 → dispatch → 세션 기록 → envelope |
| `index.ts`   | barrel                                                             |

## Conventions

- 입력 키는 `snake_case` 그대로 (외부 LLM 인터페이스)
- 외부 CLI 실패 시에도 `session_id` 디스크 기록 유지 (스펙)
- `provider` 카운터는 시도 기준으로 +1 (성공/실패 무관)
- model 미지정 → `config.default_model` 적용 (기본 `auto`)
- options 미지정 → `config.default_options` 적용 (기본 `{}`)

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
