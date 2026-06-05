# skills — prawf 동료평가 스킬

## Purpose

prawf 플러그인의 사용자 호출 스킬 컨테이너. 각 자식은 `SKILL.md` **하나로 자기설명되는**
스킬이며, `../agents/` 의 공유 페르소나를 오케스트레이션한다. 플러그인 매니페스트가
`"skills": "./skills/"` 로 이 디렉토리를 연결한다.

## Structure

| Path                | Role                                        |
| ------------------- | ------------------------------------------- |
| `review/`           | 메인 스킬 — 9인 team 평가 (P0→R1→R2→R3→ADJ) |
| `simulate-defense/` | 대화형 답변 시뮬레이션 + 코칭               |
| `rebuttal/`         | 외부 리뷰 코멘트 → 반박문 + 체크리스트      |
| `auto-fix/`         | 리뷰의 자동수정 가능 항목을 원고에 적용     |

## Conventions

- 각 스킬은 마크다운 전용(빌드 없음)이며 `SKILL.md` 가 frontmatter 엔트리다.
- **스킬은 SKILL.md 자체로 설명성을 가지므로, 스킬 디렉토리 안에 INTENT.md/DETAIL.md 를
  두지 않는다.**
- 스킬은 리뷰어를 재정의하지 않고 `../agents/` 의 페르소나를 재사용한다.
- 페르소나 id·산출물 파일명·enum 은 모든 스킬에서 동일하게 유지한다.

## Boundaries

### Always do

- 새 스킬은 `SKILL.md` 하나로 자기설명적이게 작성(영문).
- 기존 페르소나와 review 오케스트레이션 계약을 재사용.

### Ask first

- 새 스킬 추가 (기존 스킬의 얇은 변형이 아닌지 확인).

### Never do

- 스킬 디렉토리 안에 `INTENT.md`/`DETAIL.md` 생성.
- `plugin.json` 에 `agents` 필드 추가 (agents 는 `../agents/` 에서 자동 발견).
- 페르소나 로직을 스킬에 복제 (페르소나 agent 를 spawn 할 것).

## Dependencies

- 페르소나: `../agents/*.md`. 매니페스트: `../.claude-plugin/plugin.json`.
