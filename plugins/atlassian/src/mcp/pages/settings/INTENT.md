## Purpose

Atlassian 인증 설정을 위한 브라우저 UI 정적 파일 모음. 로컬 HTTP 서버가 서빙하며, file:// 프로토콜로도 mock-api를 통해 개발 가능.

## Structure

`index.html`은 정적 페이지 진입점이며 `index.ts`는 빈 빌드 표식이다. 런타임 TypeScript export로 UI를 가져오는 구조가 아니다.

## Conventions

- 브라우저 코드는 바닐라 JS를 유지한다. 배포 빌드의 축소·인라인 처리는 토큰 게이트 밖의 정적 자산 요청을 없애기 위한 것이며 런타임 프레임워크를 요구하지 않는다.
- JS-HTML 바인딩은 id 대신 data-field 속성 사용
- 서버 발급 토큰을 `location.search` 에서 읽어 submit 엔드포인트 요청에 `?token=` 부착
- 각 파일 500라인 미만 유지
- The `#config_scope` radio controls the edited layer and `configByScope[scope]` prefill. It uses the server-provided initialScope: existing project, otherwise existing user, otherwise project. Project is disabled only when its path is unavailable, not when its config file is missing.

## Boundaries

### Always do

- 모든 사용자 노출 텍스트(`index.html`·브라우저 스크립트 의 라벨·힌트·placeholder·메시지)는 영문만 사용 — `[filid:lang]` 무관
- 각 파일을 독립적으로 유지 (파일 간 전역 함수 최소화)
- data-field 속성으로 폼 필드 접근
- mock-api.js는 file:// 프로토콜에서만 활성화

### Ask first

- 새 npm 의존성 추가
- 500라인 초과가 필요한 기능 추가
- 서버 엔드포인트 인터페이스 변경

### Never do

- 브라우저 런타임에 npm import 또는 추가 컴파일러 의존성 도입
- 프레임워크(React, Vue 등) 추가
- mock-api.js를 프로덕션 경로에서 실행
- 실 에셋(CSS/JS/폰트/이미지) 비인라인 참조 — 토큰 게이트 서버에 비토큰 정적 라우트가 없어 401
