## Purpose

`@ogham/prawf` — 논문 **동료평가(peer review) 멀티에이전트** Claude Code 플러그인 (_prawf_ 는 웨일스어로 "시험·증명"). 6인의 건전성(soundness) 심사자가 논문을 공격하고, 저자 변호인이 방어하며, 편집장이 verdict(Accept / Minor / Major / Reject)와 예상 질문 시트를 산출한다. **순수 마크다운** — MCP 서버·hook·코드 빌드·런타임 의존성 0 (배포 어댑터 재생성용 `build:compile-plugin` 만 존재).

## Conventions

- 기능은 스킬·페르소나 마크다운으로만 제공한다. 코드 런타임을 추가하면 순수 마크다운 계약이 바뀐다.
- 페르소나는 네이티브 팀(`TeamCreate`/`Task`)으로 동작하며, 외부 검색은 특정 도구가 아니라 capability 로 위임한다.
- 구현 명세는 영문, 설계 의도는 한국어 정본으로 유지한다.
- 버전 주입은 매니페스트만 갱신한다. 소스 없는 플러그인에 버전 코드 파일을 만들지 않는다.

## Dependencies

- 한국어 설계 정본은 `.metadata/prawf/`에 보존한다. 영문 런타임 명세를 바꿀 때 설계 의도를 확인하는 읽기 전용 참조다.

## Boundaries

### Always do

- `agents/*.md` 와 `skills/**/SKILL.md` 는 영문 유지.
- 페르소나 id 와 산출물 파일명을 모든 명세에서 일관되게 유지.

### Ask first

- MCP 서버·hook·**코드** 빌드 단계 추가 (순수 마크다운 계약 위반; 어댑터 재생성 `build:compile-plugin` 은 예외).
- 페르소나 추가/삭제 (agents + orchestration + prompt-templates 동시 영향).

### Never do

- `plugin.json` 에 `agents` 필드 추가 (agents 는 자동 발견).
- 특정 외부 검색 도구를 페르소나에 하드코딩.
- `impact-assessor`(중요성)가 verdict 를 minor-revision 이상으로 올리는 것.
- 게이트(기본 `major`) 미만 finding 이 verdict 를 차단하는 것.
