# environmentResolver — Contract

## Requirements

- Atlassian URL 을 검사해 Cloud/Server 를 판별하고 API 버전 선택에 필요한 메타데이터를 제공한다.
- 이 판별이 엔드포인트 경로를 갈라놓는다 — Cloud 는 v3, Server/DC 는 v2 계열이다. 판별을 틀리면 모든 요청이 404 가 된다.
- Cloud 판별은 `CLOUD_HOSTNAME_PATTERN` 정규식 하나로만 한다.
- `resolveEnvironment` 는 URL 후행 슬래시를 제거한 정규화된 `base_url` 을 돌려준다.
- 버전 매핑은 서비스마다 다르다: Jira 는 `"3"`(Cloud)/`"2"`(Server), Confluence 는 `"v2"`/`"v1"` 이다. **Jira 만 호출자의 override 를 받고 Confluence 는 override 를 무시한다.**
- 순수 동기 함수다 — 네트워크도 파일 I/O 도 하지 않고 URL 문자열만 본다.

## API Contracts

- `resolveEnvironment(...): EnvironmentInfo` — `base_url`·`is_cloud`·`hostname` 을 담은 판별 결과.
- `getApiVersion(...): string` — 환경과 override 를 반영한 API 버전.

## Acceptance Criteria

### AC-cloud-detection — 환경 판별

- Atlassian Cloud 호스트가 `is_cloud: true` 로 판별된다.
- 그 밖의 호스트는 `is_cloud: false` 다.

### AC-version-mapping — 버전 매핑

- Jira 는 Cloud 에서 `"3"`, Server 에서 `"2"` 를 낸다.
- Confluence 는 Cloud 에서 `"v2"`, Server 에서 `"v1"` 을 낸다.
- Jira 는 override 를 반영하고 Confluence 는 override 를 무시한다.

### AC-url-normalization — URL 정규화

- 후행 슬래시가 제거된 `base_url` 이 반환된다.

### AC-resolver-purity — 순수성

- 판별 과정에서 네트워크 호출과 파일 I/O 가 일어나지 않는다.

## Last Updated

2026-07-30 — 환경 판별과 API 버전 선택 계약을 문서화했다.
