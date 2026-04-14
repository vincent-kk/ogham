## Purpose

Atlassian 인증 설정을 위한 브라우저 UI 정적 파일 모음.
로컬 HTTP 서버가 서빙하며, file:// 프로토콜로도 mock-api를 통해 개발 가능.

## Structure

| Directory | Role |
|---|---|
| `scripts/` | Client-side JS (app logic, JSON import modal) |
| `styles/` | CSS theme and component styles |
| `__mocks__/` | Dev-only fetch interceptor (file:// protocol) |

- `index.html` — entry point (references scripts/, styles/, __mocks__/)

## Conventions

- 순수 바닐라 JS, 빌드 스텝 없음
- JS-HTML 바인딩은 id 대신 data-field 속성 사용
- 각 파일 500라인 미만 유지

## Boundaries

### Always do
- 각 파일을 독립적으로 유지 (파일 간 전역 함수 최소화)
- data-field 속성으로 폼 필드 접근
- mock-api.js는 file:// 프로토콜에서만 활성화

### Ask first
- 새 npm 의존성 추가
- 500라인 초과가 필요한 기능 추가
- 서버 엔드포인트 인터페이스 변경

### Never do
- npm import 또는 빌드 스텝 도입
- 프레임워크(React, Vue 등) 추가
- mock-api.js를 프로덕션 경로에서 실행

## Dependencies

없음 (순수 정적 파일)
