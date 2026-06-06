## Purpose

MCP 도구 4개(`start_conversation`, `continue_conversation`, `open_settings`, `list_models`)를 묶는 컨테이너 fractal. 각 도구는 독립 서브-fractal로 분리된다.

## Structure

| Directory               | Role                                    |
| ----------------------- | --------------------------------------- |
| `startConversation/`    | 새 외부 LLM 세션 시작                   |
| `continueConversation/` | 기존 세션 이어 호출 (project_hash 검증) |
| `openSettings/`         | 설정 웹 UI 기동 (일회용 토큰 인증)      |
| `listModels/`           | provider별 사용 가능 모델 목록 반환     |

## Conventions

- 도구마다 `INTENT.md` + `index.ts` 보유 (독립 서브-fractal)
- 입력 키는 `snake_case` (외부 LLM 인터페이스 일관성)
- 응답은 `ConversationResponse` 표준 envelope
- 도구 이름은 `<verb>_<noun>` snake_case

## Boundaries

### Always do

- 새 도구 추가 시 `server/createServer.ts` 와 플러그인 매니페스트 동시 갱신
- 각 도구 서브-fractal 에 `INTENT.md` 보유 유지

### Ask first

- 도구 이름 변경 또는 입력 스키마 키 변경
- 새 서브-fractal 추가

### Never do

- 도구 서브-fractal 간 직접 import (`server/lifecycle/createServer.ts` 가 단독 등록)
- 이 컨테이너에 peer 파일 추가 (index.ts 제외)

## Dependencies

없음 — 자식 fractal이 각각 의존성을 보유한다.
