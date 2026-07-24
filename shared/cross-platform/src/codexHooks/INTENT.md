## Purpose

Codex 도구 호출을 Claude 훅 도구 어휘로 **순수 정규화**. Codex 모델은 파일 편집을 `{tool_name:"apply_patch", tool_input:{command:<V4A 패치>}}` 로, 읽기를 `Bash`(`cat`/`head`/…)로 보내므로(실측), Claude 도구명(`Write`/`Edit`/`Read`)에 매칭하는 filid·imbas·maencof PreToolUse 핸들러가 Codex 에서 발화하지 않는다. 이 모듈이 그 격차만 메운다 — 부수효과·env 판독 없음.

## Structure

| File                  | Role                                                  |
| --------------------- | ----------------------------------------------------- |
| `index.ts`            | barrel                                                |
| `types.ts`            | `ApplyPatchOp` · `CodexToolUse` 최소 타입 (organ)     |
| `parseApplyPatch.ts`  | V4A 패치 → 파일 연산 목록 (순수 파서)                 |
| `parseBashRead.ts`    | 단순 셸 읽기(`cat foo.md`) → 파일 경로 (순수 파서)    |
| `normalizeToolUse.ts` | Codex 입력 → Claude `Write`/`Edit`/`Read` 입력 재작성 |

## Conventions

- **순수 함수만** — `node:*` I/O·`process.env` 금지.
- `command` 없는 입력은 무변경 통과 (Claude `Write`/`Edit`/`Read`·MCP·agy 무영향).
- add→`Write`(전체 파일 = `+`줄), update→`Edit`(hunk 의 old/new), delete→무변경(Claude 도 delete 를 PreToolUse 가드 안 함).
- `Bash` 단순 단일파일 읽기만 `Read` 로 승격 — 셸 메타문자(파이프·리다이렉트·글롭)면 무변경(write 오분류 방지).

## Boundaries

### Always do

- `command` 비문자열·미인식 도구는 입력 그대로 반환.
- 다중 파일 패치는 **첫 파일 연산만** 정규화 (모델은 패치당 1파일 방출 — 실측).
- 경로 **관련성**(vault `.md`·FCA 소스) 판단은 소비 핸들러에 위임 — 파서는 추출만.

### Ask first

- 다중 파일 연산 전수 처리(핸들러 per-op 반복) 도입.
- `Read` 승격 대상 셸 명령 확장(파이프·`grep`·`awk` 등 복합 표현).

### Never do

- 이 모듈에서 파일·프로세스 I/O 또는 `process.env` 판독.
- Codex 전용 분기를 소비 플러그인에 인라인 (정규화는 여기 소유).

## Dependencies

- 없음 (Node 내장조차 쓰지 않는다).
