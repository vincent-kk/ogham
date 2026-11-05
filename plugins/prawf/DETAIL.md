# prawf — Public Contract Specification

패키지 표면은 10인의 페르소나 agent 가 뒷받침하는 4개의 skill 이다. 코드 API 는 없으며, 아래 계약은 모두 Claude Code 가 런타임에 소비하는 마크다운/오케스트레이션 약속이다.

## Requirements

- 플러그인은 `skills` 만으로 로드되어야 한다 — `mcpServers`·`hooks`·빌드 산출물 없음. `validate-plugin` 이 `.claude-plugin/plugin.json` 에 대해 통과해야 한다.
- 페르소나 id, 산출물 파일명, axis id, verdict/status enum 은 `agents/*.md`, `skills/peer-review/orchestration.md`, `skills/peer-review/prompt-templates.md`, `skills/peer-review/templates.md`, 그리고 각 `SKILL.md` 에서 동일해야 한다.
- verdict 는 게이트 이상에서 미해결인 **soundness** finding 만의 순수 함수여야 한다 (게이트 = `--gate`, 기본 `major` — accept 를 차단할 수 있는 최저 severity). 게이트 미만 미해결 finding 은 advisory 로 `review-report.md` 의 Advisory Notes 섹션에 보존되며, advisory 가 비어 있지 않은 accept 는 본문에서 "accept (with notes)" 로 표기한다(frontmatter·터미널 마커는 `accept` 그대로). 치명 결함 override 는 게이트와 무관하다. 중요성(`impact-assessor`)은 advisory 이며 verdict 를 Minor Revision 이상으로 올리지 못한다.
- 모든 스킬의 산출물 베이스 경로는 단일 WORKDIR 규약을 따른다: 우선순위 `--workdir <dir>` > 환경변수 `PRAWF_WORKDIR` > 기본값 `./.prawf`. 해석 규칙의 단일 출처는 `skills/.shared/operations/resolve_workdir.md` 이며 4개 스킬이 공유한다.

## API Contracts

- 중요성과 게이트 미만 finding은 advisory이며 치명 결함 override는 게이트와 무관하다.
- 구체적인 consequence를 명명할 수 없는 finding은 minor를 넘지 않는다. 심각도가 결론에 미치는 영향 없이 부풀려지는 것을 막는다. critical은 새 데이터 없이 복구 불가, major는 기존 데이터 내 복구 가능, minor는 결론 불변을 뜻한다.
- advisory가 남은 accept는 본문에서 "accept (with notes)"로 표시하되 frontmatter와 터미널 enum은 accept를 유지한다. 표현을 늘리기 위해 기계 소비 계약을 바꾸지 않는다.
- 스킬은 같은 논문 디렉터리와 정규화 원고의 좌표를 공유한다. review·defense·rebuttal·auto-fix가 서로 다른 원고 위치를 인용하지 않게 한다.
- `rebuttal.md`는 peer-review와 rebuttal 두 스킬이 같은 논문 디렉터리에서 재생성하는 중간 산출물이므로 최종 산출물로 취급하지 않는다. Advisory Notes도 보고서 내부 섹션이며 별도 산출물이 아니다.
- 버전 주입은 매니페스트만 갱신한다. 소스가 없는 플러그인에 버전 소스 파일을 생성하지 않는다. 배포 어댑터 재생성은 순수 마크다운 계약의 코드 빌드 금지에서 제외한다.

## Acceptance Criteria

### AC-manifest-skills-only — 순수 마크다운 표면

- `.claude-plugin/plugin.json` 에 `mcpServers`·`hooks` 키가 없고 `agents` 필드도 없다 (agents 는 런타임 자동 발견).
- `validate-plugin` 이 매니페스트에 대해 통과한다.
- 저장소에 `bridge/`·`src/version.ts` 가 없으며 `version:sync` 는 `plugin.json` 만 갱신한다.

### AC-identifier-consistency — 식별자 단일성

- 페르소나 id 10개가 `agents/*.md` 파일명과 peer-review 오케스트레이션·프롬프트·템플릿·각 스킬 진입 명세 에서 동일하다.
- axis id, `verdict`·`gate`·`severity`·`status`·`impact`·`external_verification` enum 값이 위 문서 전체에서 동일하다.
- 산출물 파일명이 4개 스킬의 명세와 일치한다.

### AC-verdict-gate-purity — verdict 순수성

- verdict 는 게이트(`--gate`, 기본 `major`) 이상에서 미해결인 soundness finding 만의 함수다.
- 게이트 미만 미해결 finding 은 `review-report.md` 의 Advisory Notes 에만 나타나고 verdict 를 바꾸지 않는다.
- `impact-assessor` 의 중요성 판정은 verdict 를 `minor-revision` 이상으로 올리지 못한다.
- consequence 를 명명하지 못한 finding 의 severity 는 `minor` 를 넘지 않는다.

### AC-workdir-resolution — 산출물 경로 규약

- WORKDIR 해석 우선순위가 `--workdir <dir>` > `PRAWF_WORKDIR` > `./.prawf` 이며, 해석 규칙의 정의는 `skills/.shared/operations/resolve_workdir.md` 한 곳에만 있다.
- 4개 스킬이 같은 `REVIEW_DIR = <WORKDIR>/review/<paper-slug>/` 를 공유한다.

## Last Updated

판정 게이트·명세 식별자·산출물 공유 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
