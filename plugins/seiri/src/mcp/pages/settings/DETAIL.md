# settings — Contract

## Requirements

- 폼은 두 가지를 한 화면에서 정한다: 배포할 규칙 선택과 훅 workflow mode. mode는 `off`·`advisory`·`standard`·`strict` 네 값이고, 새 설정의 기본 `off`는 `Skills only`로 표시한다.
- `Skills only`는 스킬 설치·명시 호출을 유지하고 훅 context·상태 변경·wire 응답을 없앤다는 뜻이다. 다른 세 값은 기존 다이얼 의미를 유지한다.
- `scope`(user/project) 는 결정 하나다 — 다이얼이 저장될 레이어와 규칙이 배포될 레이어를 함께 정한다.
- 모든 요청에 `?token=` 을 부착한다. 저장 본문은 JSON 이다.
- `/plan` 이 준 revision 을 `/save` 로 왕복시키고, stale 응답이 오면 다시 검토하게 만든다.
- 체크박스 기본값은 **파일시스템 상태**에서 온다. 배포된 것이 하나도 없을 때만 `recommended` 를 미리 체크한다 — 손으로 지운 규칙이 되살아나지 않도록.
- 드리프트 행은 최신 템플릿으로 교체하는 선택을 **행마다 기본 체크**한다. 사용자가 해제하면 로컬 편집을 보존하며, 일괄 덮어쓰기는 없다.
- **재정의 해제 버튼은 두지 않는다.** project 계층은 팀이 커밋으로 소유하는 파일이라, 없애는 일은 설정 클릭이 아니라 git 작업이다.
- 사용자 문자열은 `textContent` 로만 넣는다 — `innerHTML` 을 쓰지 않는다.
- 저장 전에 파일이 이미 바뀐 것처럼 보이게 하는 낙관적 렌더를 하지 않는다.
- 서버 모듈을 import 하지 않는 독립 스크립트다. 외부 CDN·폰트·`eval`·inline 핸들러를 쓰지 않는다.
- 페이지 문구는 영어로 유지한다.

## API Contracts

- 소비 라우트: `GET /`(폼), `POST /plan`(dry-run), `POST /save`(적용).
- 서버 주입 상태로 현재 배포 상태·드리프트·다이얼 계층을 받는다.

## Acceptance Criteria

### AC-single-scope-decision — 단일 스코프 결정

- 규칙 배포와 다이얼 저장이 같은 `scope` 값을 쓴다.

### AC-skills-only-default — 훅 opt-in

- 새 설정에서 네 mode가 visible label과 도움말을 가진 radio로 표시되고 `Skills only`가 선택된다.
- 저장 payload는 UI label이 아니라 정본 값 `off`를 쓴다.

### AC-preview-before-save — 미리보기 선행

- 저장 전에 `/plan` 결과가 화면에 표시된다.
- revision 이 어긋나면 저장이 진행되지 않는다.

### AC-defaults-from-filesystem — 기본값의 출처

- 배포 상태가 있는 규칙은 그 상태대로 체크되고, 손으로 지운 규칙이 자동으로 되살아나지 않는다.
- 드리프트 행은 교체가 기본 체크이고, 해제하면 로컬 편집이 보존된다.

### AC-no-external-assets — 외부 자산 없음

- 페이지가 외부 스크립트·폰트를 로드하지 않는다.
- 사용자 문자열이 `textContent` 로만 삽입된다.

## Last Updated

2026-09-03 — `Skills only` 기본 mode와 네 값 radio 계약을 추가했다.
