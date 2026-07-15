## Purpose

Codex `apply_patch` 도구 호출을 Claude 훅 도구 어휘(`Write`/`Edit`)로 **순수 정규화**. Codex 모델은 파일 편집을 `{tool_name:"apply_patch", tool_input:{command:<V4A 패치>}}` 로 보내고 읽기·검색을 `Bash` 로 처리하므로(2026-07-15 실측), Claude 도구명(`Write`/`Edit`/`Read`)에 매칭하는 filid·imbas·maencof PreToolUse 핸들러가 Codex 에서 발화하지 않는다. 이 모듈이 그 격차만 메운다 — 부수효과·env 판독 없음.

## Structure

| File                  | Role                                                   |
| --------------------- | ------------------------------------------------------ |
| `index.ts`            | barrel                                                 |
| `types.ts`            | `ApplyPatchOp` · `CodexToolUse` 최소 타입 (organ)      |
| `parseApplyPatch.ts`  | V4A 패치 → 파일 연산 목록 (순수 파서)                  |
| `normalizeToolUse.ts` | `apply_patch` 입력 → Claude `Write`/`Edit` 입력 재작성 |

## Conventions

- **순수 함수만** — `node:*` I/O·`process.env` 금지.
- `apply_patch` 가 **아닌** 모든 입력은 무변경 통과 (Claude `Write`/`Edit`/`Read`·`Bash`·MCP 무영향).
- add→`Write`(전체 파일 = `+`줄), update→`Edit`(hunk 의 old/new), delete→무변경(Claude 도 delete 를 PreToolUse 가드 안 함).

## Boundaries

### Always do

- `apply_patch` 외 tool_name·`command` 비문자열은 입력 그대로 반환.
- 다중 파일 패치는 **첫 파일 연산만** 정규화 (모델은 패치당 1파일 방출 — 실측).

### Ask first

- 다중 파일 연산 전수 처리(핸들러 per-op 반복) 도입.
- `Bash` 명령에서 파일 경로 추출 (읽기 계열 추적 복원 시도).

### Never do

- 이 모듈에서 파일·프로세스 I/O 또는 `process.env` 판독.
- Codex 전용 분기를 소비 플러그인에 인라인 (정규화는 여기 소유).

## Dependencies

- 없음 (Node 내장조차 쓰지 않는다).
