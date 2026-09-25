# settings — Contract

## Requirements

- 서버가 공통 `resolveInitialConfigScope`로 계산한 `initialScope`를 초기 선택으로 사용한다. project 설정이 있으면 project, user 설정만 있으면 user, 둘 다 없으면 project다. 페이지는 이 조건을 재판단하지 않는다.

- 폼은 두 가지를 한 화면에서 정한다: 배포할 규칙 선택과 훅 workflow mode. mode는 `off`·`advisory`·`standard`·`strict` 네 값이고, 새 설정의 기본 `off`는 `Skills only`로 표시한다.
- Skills only와 advisory는 스킬 선택을 유지하면서 자동 주입·신규 관측을 하지 않습니다. 기존 참여의 신뢰되는 경계 철회는 허용합니다. standard/strict는 명시적 활성 작업만 보조하며 모든 mode에서 전역 배너·선출을 하지 않습니다.
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

### AC-settings-project-default — 프로젝트 기본 범위

- 서버의 `initialScope`가 user와 project 어느 값이든 페이지가 그대로 선택한다.
- 사용자가 범위를 바꾸면 해당 계층을 편집·저장하며, 상태 재수신은 이 선택을 덮어쓰지 않는다.

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

2026-09-13 — 프로젝트 기본 범위와 명시적 전역 저장 선택 계약을 반영했다.
