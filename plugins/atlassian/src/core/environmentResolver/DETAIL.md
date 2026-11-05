# environmentResolver — Contract

## Requirements

- 이 판별이 엔드포인트 경로를 갈라놓는다 — Cloud 는 v3, Server/DC 는 v2 계열이다. 판별을 틀리면 모든 요청이 404 가 된다.
- Cloud 판별은 `CLOUD_HOSTNAME_PATTERN` 정규식 하나로만 한다.
- 버전 매핑은 서비스마다 다르다: Jira 는 Cloud에서 `"3"`, Server에서 `"2"`이며, Confluence 는 각각 `"v2"`, `"v1"` 이다. **Jira 만 호출자의 override 를 받고 Confluence 는 override 를 무시한다.**
- 순수 동기 함수다 — 네트워크도 파일 I/O 도 하지 않고 URL 문자열만 본다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-resolver-purity — 순수성

- 판별 과정에서 네트워크 호출과 파일 I/O 가 일어나지 않는다.

## Last Updated

Cloud 판별과 서비스별 API 버전 override 정책이 바뀔 때 갱신한다.
