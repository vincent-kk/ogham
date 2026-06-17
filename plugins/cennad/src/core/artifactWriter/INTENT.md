## Purpose

성공한 `ConversationResponse` 를 사람-친화 마크다운으로 디스크에 미러링하는 선택적 artifact 작성기. PR 첨부·세션 회상 용도이며, 호출자가 명시적으로 opt-in 한 경우에만 동작한다.

## Structure

| Path                           | Role                                                   |
| ------------------------------ | ------------------------------------------------------ |
| `operations/writeArtifact.ts`  | 경로 결정 → 마크다운 렌더 → atomicWrite 오케스트레이션 |
| `utils/resolveArtifactPath.ts` | project / user 분기 경로 해석                          |
| `utils/renderMarkdown.ts`      | YAML front-matter + 본문 렌더러                        |
| `index.ts`                     | barrel — `writeArtifact`                               |

## Conventions

- 모든 쓰기는 `lib/atomicWrite` 경유 (파일 0o600, 디렉토리 0o700)
- 파일명 규칙: `<session_id>-<turn>.md`
- project 모드: `<cwd>/.cennad/artifacts/`
- user 모드: `~/.claude/plugins/cennad/artifacts/<projectHash>/`
- 호출자는 `artifacts.enabled` 와 `result.status === 'success'` 를 사전에
  확인하고 호출한다 — 작성기는 호출되면 항상 쓰기를 시도한다
- 쓰기 실패는 절대 응답을 막지 않는다 — 로그만 남기고 `undefined` 반환

## Boundaries

### Always do

- 호출자가 주입한 `ArtifactsConfig`, `cwd`, `projectHash` 를 그대로 사용
- 모든 에러를 catch 해서 `lib/logger` 로 기록 후 `undefined` 반환

### Ask first

- 마크다운 외 포맷 추가 (json sidecar, html mirror 등)
- 파일명 규칙 변경 (소비자가 파일명을 스크랩할 수 있음)

### Never do

- 쓰기 실패 시 throw
- 세션 파일을 읽거나 수정
- 설정된 artifact 루트 밖에 쓰기
- `core/configManager` 를 import (작성기는 호출자가 주입한 설정만 사용)

## Dependencies

- `node:path` (via `constants/paths`)
- `lib/atomicWrite`, `lib/logger`
- `constants/paths` (`artifactPath` 헬퍼)
- `types` (`ArtifactsConfig`, `Provider`)
