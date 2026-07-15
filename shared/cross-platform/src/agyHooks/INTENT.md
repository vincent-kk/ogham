## Purpose

agy 훅 계약 ↔ Claude 훅 계약 **순수 번역**. agy 는 Claude 포맷 `hooks.json` 을 오독해 0개 로드하므로(matrix §4.3 G5), 별도 agy 러너가 agy 의 camelCase 페이로드를 Claude 계약으로 정규화하고 응답을 역변환한다 — 그 번역 규칙의 단일 소스. 부수효과·env 판독 없음(러너가 I/O·once-guard 소유).

## Structure

| File               | Role                                                          |
| ------------------ | ------------------------------------------------------------ |
| `index.ts`         | barrel                                                        |
| `types.ts`         | 두 계약의 최소 타입 (organ)                                   |
| `eventMap.ts`      | Claude 이벤트 → agy 이벤트 (SessionStart·UserPromptSubmit→PreInvocation) |
| `toClaudeInput.ts` | agy 페이로드 → Claude snake_case 입력                        |
| `toAgyResponse.ts` | Claude 출력 → agy 응답(injectSteps)                          |

## Conventions

- **순수 함수만** — `node:*` I/O 금지. stdin/stdout·프로세스 스폰·once-guard 는 러너가 소유.
- 현재 **PreInvocation 매핑(SessionStart·UserPromptSubmit)만** 번역 — 도구 이벤트(PreToolUse/PostToolUse)는 도구명·인자 번역이 필요한 후속 단계이며, 미지원 이벤트는 조용히 통과시키지 않고 **throw**.
- `cwd` 는 `workspacePaths[0]`, `session_id` 는 `conversationId`.

## Boundaries

### Always do

- 미지원 이벤트는 throw (반쪽 번역 금지).
- Claude `additionalContext` → agy `ephemeralMessage` 1건, 없으면 빈 `injectSteps`.

### Ask first

- PreToolUse/PostToolUse 번역 추가 (agy 도구명·인자 스키마 실측 선행).
- 새 agy 응답 필드(`permissionOverrides` 등) 매핑.

### Never do

- 이 모듈에서 파일·프로세스 I/O 또는 `process.env` 판독.
- SessionStart once-guard 상태를 여기 두기 (러너 소유).

## Dependencies

- 없음 (Node 내장조차 쓰지 않는다).
