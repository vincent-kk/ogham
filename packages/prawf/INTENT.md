## Purpose

`@ogham/prawf` — 논문 **동료평가(peer review) 멀티에이전트** Claude Code 플러그인
(_prawf_ 는 웨일스어로 "시험·증명"). 6인의 건전성(soundness) 심사자가 논문을 공격하고,
저자 변호인이 방어하며, 편집장이 verdict(Accept / Minor / Major / Reject)와 예상 질문
시트를 산출한다. **순수 마크다운** — MCP 서버·hook·빌드·런타임 의존성 0.

## Structure

| Path                         | Role                                                                  |
| ---------------------------- | --------------------------------------------------------------------- |
| `agents/`                    | 페르소나 10인 (soundness 6 + impact + rebuttal + chair + adjudicator) |
| `skills/review/`             | 메인 9인 team 평가 + 이식 명세 + 프로파일                             |
| `skills/simulate-defense/`   | 답변 시뮬레이션 스킬                                                  |
| `skills/rebuttal/`           | 외부 리뷰 코멘트 → 반박문 스킬                                        |
| `.claude-plugin/plugin.json` | 플러그인 매니페스트 (skills 전용; `mcpServers` 없음)                  |
| `package.json`               | 메타 + `version:sync` (빌드 없음)                                     |

## Conventions

- 순수 마크다운 플러그인 — 기능은 `skills/` + `agents/` 로만 제공, `bridge/` 없음.
- 페르소나는 네이티브 팀(`TeamCreate`/`Task`)으로 동작하며, 외부 검색은 특정 도구가
  아니라 capability 로 위임한다.
- 영문 구현; 한국어 설계 SSoT 는 `.metadata/prawf/` 에 보존.
- `version:sync` 는 `package.json` 버전을 `plugin.json` 에만 동기화.

## Boundaries

### Always do

- `agents/*.md` 와 `skills/**/SKILL.md` 는 영문 유지.
- 페르소나 id 와 산출물 파일명을 모든 명세에서 일관되게 유지.

### Ask first

- MCP 서버·hook·빌드 단계 추가 (순수 마크다운 계약 위반).
- 페르소나 추가/삭제 (agents + orchestration + prompt-templates 동시 영향).

### Never do

- `plugin.json` 에 `agents` 필드 추가 (agents 는 자동 발견).
- 특정 외부 검색 도구를 페르소나에 하드코딩.
- `impact-assessor`(중요성)가 verdict 를 minor-revision 이상으로 올리는 것.

## Dependencies

- **런타임**: 없음 (순수 마크다운).
- **도구**: `version:sync` 용 루트 `scripts/inject-version.mjs`.
- **설계 SSoT**: `.metadata/prawf/` (한국어, 읽기 전용 참조).
