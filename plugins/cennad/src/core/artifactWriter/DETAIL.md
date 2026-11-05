## Requirements

- 성공한 `ConversationResponse` 를 단일 마크다운 파일 (YAML front-matter + 본문) 로 디스크에 미러링한다. 호출자가 opt-in 한 경우에만 동작.
- 응답 경로를 절대 막지 않는다. 쓰기 실패는 MCP 핸들러로 전파되지 않으며, 호출자는 `undefined` 를 받고 envelope 는 `artifact_path` 를 생략한다.
- `ArtifactsConfig.location` (`project` | `user`) 을 따라 파일을 프로젝트 작업 디렉토리 또는 cennad 사용자 홈으로 라우팅한다.
- `ArtifactsConfig` 는 호출자가 주입한다 — 내부에서 `core/configManager` 를 import 하지 않는다.

## API Contracts

- opt-in과 성공 응답 여부는 호출자가 검사한다. 작성기는 호출되면 항상 쓰기를 시도하므로 이 전제를 내부 설정 조회로 대체하지 않는다.
- 호출자는 raw prompt와 실제 CLI 전송용 composed prompt를 구분해 전달한다. 둘이 다르면 함께 남겨 실제 전송 내용을 조사할 수 있어야 한다.
- 경로 해석·렌더·원자 쓰기의 실패는 경고와 `undefined`로 흡수한다. 선택적 미러링 실패가 대화 응답을 막아서는 안 된다.
- front-matter 문자열은 YAML 안전을 위해 JSON 문자열 직렬화를 사용한다. 파일명은 소비자가 스크랩할 수 있으므로 변경 전에 승인을 받는다.
- 파일 권한은 원자 쓰기 헬퍼의 기본값을 상속한다. 파일 레이아웃과 본문 형태는 구현과 테스트를 읽는다.

## Acceptance Criteria

### AC-opt-in-only — 명시적 동의

- 호출자가 opt-in 하지 않으면 아무 파일도 쓰지 않는다.

### AC-success-only — 성공 응답만 미러링

- 실패한 `ConversationResponse` 는 artifact 로 남지 않는다.

## Last Updated

artifact 호출 전제·기록 실패 격리·원문 보존 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
