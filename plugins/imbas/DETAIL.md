# imbas — Contract

## Requirements

- setup 하위 명령과 헤드리스 설정은 project 범위를 기본으로 사용하며, user 전역 변경은 사용자가 명시적으로 요청한 경우에만 수행한다.

- 패키지는 기획자 사이드 파이프라인 `refine → estimate(skip 가능) → split` 을 스킬·에이전트·MCP 서버 세 표면으로 배송한다.
- phase 진행의 정본은 `.imbas/<PROJECT_REF>/runs/<run_id>/state.json` 이고, 이슈 생성 진행의 정본은 stories 매니페스트의 `issue_ref`·`status` 다. 두 정본을 한 곳으로 합치지 않는다.
- provider 는 `jira` · `github` · `local` 셋이다. 한 스킬 실행이 provider X 를 대상으로 하면 `references/Y/**` 를 읽지 않는다 — provider 별 계약이 서로 새면 실행 결과가 대상 트래커와 어긋난다.
- `bridge/` · `public/` · `.codex-plugin/` · 루트 `plugin.json` 은 빌드 산출물이다. 커밋되지만 손편집하지 않는다.

## API Contracts

- 호스트는 매니페스트를 진입점으로 사용한다. TypeScript 배럴만 고쳐서는 배송 표면을 바꿀 수 없다.
- MCP 실행 파일과 설정 HTML은 정본 소스에서 생성한다. 버전 상수도 version:sync의 산출물이므로 손편집하지 않는다.

## Acceptance Criteria

### AC-shipped-surface — 배송 표면 일치

- `package.json` 의 `files` 에 나열된 모든 경로가 빌드 후 실제로 존재한다.
- `files` 에 `src` 가 포함되지 않는다 — 소스는 배송 표면이 아니다.

### AC-manifest-version-sync — 매니페스트 버전 동기

- `package.json` 의 `version` 과 `.claude-plugin/plugin.json` 의 `version` 이 같다.
- `src/version.ts` 의 `VERSION` 이 `package.json` 의 `version` 과 같다.

### AC-provider-isolation — provider 경계 격리

- `skills/<skill>/references/<provider>/` 문서는 다른 provider 디렉터리 경로를 참조하지 않는다.
- provider 중립 계약은 provider 디렉터리 밖에만 존재한다.

### AC-generated-not-handwritten — 생성물 비손편집

- `bridge/` · `public/` · `.codex-plugin/` 의 내용이 공식 build 재실행 결과와 일치한다.

## Last Updated

provider 격리·진행 정본·배송 계약의 내용과 근거가 바뀔 때 갱신한다.
