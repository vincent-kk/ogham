# settings — Contract

## Requirements

- Atlassian 인증 설정을 위한 브라우저 UI 정적 파일 모음이다. 로컬 HTTP 서버가 서빙한다.
- `file://` 프로토콜에서도 mock-api 를 통해 개발할 수 있어야 한다 — 다만 **mock-api 는 배포 빌드에 포함하지 않는다.**
- 자격증명은 화면에 평문으로 표시하지 않는다. 마스킹(`••••••••••`)만 보인다.
- 모든 요청에 토큰을 부착하고 POST 본문은 JSON 이다.
- 외부 CDN·폰트를 로드하지 않으며 페이지 문구는 영어를 유지한다.

## API Contracts

- 소비 라우트: 설정 폼 조회, 연결 테스트, 저장.
- 서버가 주입한 상태로 현재 설정을 prefill 한다.

## Acceptance Criteria

### AC-secret-masking — 비밀 마스킹

- 저장된 자격증명이 화면에 평문으로 나타나지 않는다.

### AC-dev-code-excluded — 개발 코드 제외

- 배포된 `public/settings.html` 에 mock-api 코드가 없다.

### AC-no-external-assets — 외부 자산 없음

- 페이지가 외부 스크립트·폰트를 로드하지 않는다.

## Last Updated

2026-07-30 — 설정 UI 계약을 문서화했다.
