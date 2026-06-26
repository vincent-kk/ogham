## Purpose

NCBI E-utilities 설정 폼 페이지(개발자 도구 스타일, 라이트/다크). 서버가 주입한 현재 설정을 prefill하고, EInfo 테스트·저장을 로컬 서버 API로 수행한다.

## Structure

| 파일 | 역할 |
| --- | --- |
| `index.html` | 폼 마크업 + 상태 주입 자리(`__ENTREZ_STATE__`) |
| `styles/styles.css` | 토큰 기반 스타일(prefers-color-scheme) |
| `scripts/app.js` | prefill·검증·rate badge·/test·/submit |

## Conventions

- 의존성 없는 vanilla JS(ES5 호환), SVG 아이콘(이모지 금지), 접근성 라벨/포커스.
- masked api_key(`••••`)는 미변경 의미 — 그대로 전송.

## Boundaries

### Always do

- 모든 인터랙션 요소에 라벨/포커스 상태. 44px 이상 터치 타깃.
- api_key는 화면 마스킹·show/hide만, 평문 영속/노출 없음.

### Ask first

- 폼 필드 추가/제거(백엔드 zod 스키마와 동기).

### Never do

- 외부 폰트/스크립트 로드. 이모지 아이콘. inline 비밀 노출.

## Dependencies

- 런타임: 로컬 setup 서버 API(`/status`·`/test`·`/submit`)
