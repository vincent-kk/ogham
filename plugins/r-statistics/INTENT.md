## Purpose

`@ogham/r-statistics` 패키지 루트. 도메인 중립 통계 추론을 결정적 실행·검증 MCP가 감싸며 Claude와 Codex에서 같은 관리형 R library를 사용한다.

## Conventions

- 빌드(도메인 스크립트 조합): `clean → version:sync → compile → mcp → compile-plugin`
- 스킬 이름 prefix 없음 (plugin namespace 자동); MCP 도구는 `mcp__plugin_r-statistics_tools__*`
- 에이전트는 `agents/` 자동 발견 (plugin.json 에 agents 필드 없음 — filid 동일)
- Hook 없음

## Boundaries

### Always do

- 디스크 경로는 공유 host resolver가 선택한 plugin cache 하위
- 개발 착수 전 저장소의 통계 설계 명세 확인
- 샘플·예시·기본값은 응용 도메인을 암시하지 않는다
- setup 설치는 `run_r.managedLibraryPath`만 사용

### Ask first

- 새 빌드 스크립트 추가
- `package.json` `files` 배열 변경

### Never do

- 배포 산출물 커밋 (플러그인 배포용 번들은 의도적 예외)
- 소스와 매니페스트의 version 수동 수정 (버전 주입 스크립트만 사용)
- setup 문서에서 호스트별 state root를 다시 계산
