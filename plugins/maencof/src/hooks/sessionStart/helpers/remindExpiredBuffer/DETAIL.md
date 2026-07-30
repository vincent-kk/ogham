# remindExpiredBuffer — Contract

## Requirements

- 아무것도 삭제하지 않는다. L5 buffer 의 만료 처리는 승격이냐 폐기냐라는 **판단**이고 폐기는 비가역이므로, 이 관심사는 알림만 내고 실제 처리는 사용자와 스킬(`/maencof:organize`·`/maencof:cleanup buffer`)에 맡긴다. L4 의 `archiveExpired`(이동·가역·자동)와 대칭이다.
- 훅 번들에 들어가므로 Node builtin 과 tree-shake 가능한 `@ogham/cross-platform/paths` 만 쓴다. frontmatter 의 `expires` 는 zod 없이 경량 추출한다.
- SessionStart 관심사는 동기다. `readdirSync`·`readFileSync` 로 처리한다.
- buffer 디렉터리가 없으면 no-op 이다. 볼트가 아니어도 no-op.
- 목록은 `MAX_LISTED_PATHS` 까지만 싣고 나머지는 개수로 접는다 — 알림이 세션 컨텍스트를 잠식하지 않게.

## API Contracts

- `runRemindExpiredBuffer(currentWorkingDirectory)` — `RemindExpiredBufferResult`. 만료 문서가 없으면 `{ continue: true }` 만, 있으면 `hookSpecificOutput.additionalContext` 에 정리 촉구 문구를 담는다.
- `RemindExpiredBufferResult` — `continue` 와 선택적 `hookSpecificOutput`.

## Acceptance Criteria

### AC-never-deletes — 삭제 금지

- 이 fractal 이 파일 삭제·이동을 호출하지 않는다.

### AC-noop-without-buffer — buffer 부재 no-op

- 볼트가 아니거나 buffer 디렉터리가 없으면 부수효과 없이 통과한다.

### AC-listing-capped — 목록 상한

- 만료 문서가 상한을 넘으면 나머지는 개수로 요약된다.

## Boundary Exemptions

### `remindExpiredBuffer.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. SessionStart orchestrator 가 이 관심사를 직접 가져오는 것은 `sessionStart/INTENT.md` 가 선언한 형태이고, 같은 번들이 L1 전체 본문과 meta-skill 본문도 실어야 하므로 배럴 경유가 57344 바이트 캡을 잠식한다.

## Last Updated

2026-07-30 — 비삭제 경계·경량 추출 계약과 훅 직접 import 면책을 문서화했다.
