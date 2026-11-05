# settings — Contract

## Requirements

- 서버가 공통 `resolveInitialConfigScope`로 계산한 `initialScope`를 초기 선택으로 사용한다. project 설정이 있으면 project, user 설정만 있으면 user, 둘 다 없으면 project다. 페이지는 이 조건을 재판단하지 않는다.

- Atlassian 인증 설정을 위한 브라우저 UI 정적 파일 모음이다. 로컬 HTTP 서버가 서빙한다.
- `file://` 프로토콜에서도 mock-api 를 통해 개발할 수 있어야 한다 — 다만 **mock-api 는 배포 빌드에 포함하지 않는다.**
- 자격증명은 화면에 평문으로 표시하지 않는다. 마스킹(`••••••••••`)만 보인다.
- 모든 요청에 토큰을 부착하고 POST 본문은 JSON 이다.
- 외부 CDN·폰트를 로드하지 않으며 페이지 문구는 영어를 유지한다.

## API Contracts

서버가 주입한 상태가 prefill과 초기 scope의 근거다. 페이지가 초기 범위를 다시 판단하거나 상태 재수신으로 사용자의 명시적 범위 선택을 덮어쓰지 않는다.

## Acceptance Criteria

### AC-secret-masking — 비밀 마스킹

- 저장된 자격증명이 화면에 평문으로 나타나지 않는다.

### AC-no-external-assets — 외부 자산 없음

- 페이지가 외부 스크립트·폰트를 로드하지 않는다.

## Last Updated

초기 scope·마스킹·오프라인 UI와 배포 코드 제외 정책이 바뀔 때 갱신한다.
