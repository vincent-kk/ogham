# prawf — Public Contract Specification

패키지 표면은 10인의 페르소나 agent 가 뒷받침하는 4개의 skill 이다. 코드 API 는 없으며,
아래 계약은 모두 Claude Code 가 런타임에 소비하는 마크다운/오케스트레이션 약속이다.

## Requirements

- 플러그인은 `skills` 만으로 로드되어야 한다 — `mcpServers`·`hooks`·빌드 산출물 없음.
  `validate-plugin` 이 `.claude-plugin/plugin.json` 에 대해 통과해야 한다.
- 페르소나 id, 산출물 파일명, axis id, verdict/status enum 은 `agents/*.md`,
  `skills/review/orchestration.md`, `skills/review/prompt-templates.md`,
  `skills/review/templates.md`, 그리고 각 `SKILL.md` 에서 동일해야 한다.
- verdict 는 미해결 **soundness** finding 만의 순수 함수여야 한다. 중요성
  (`impact-assessor`)은 advisory 이며 verdict 를 Minor Revision 이상으로 올리지 못한다.
- 모든 스킬의 산출물 베이스 경로는 단일 WORKDIR 규약을 따른다: 우선순위
  `--workdir <dir>` > 환경변수 `PRAWF_WORKDIR` > 기본값 `./.prawf`. 해석 규칙의 단일
  출처는 `skills/_shared/operations/resolve_workdir.md` 이며 4개 스킬이 공유한다.

## API Contracts

### Skills

| Command                   | Purpose                                 | Primary output                                 |
| ------------------------- | --------------------------------------- | ---------------------------------------------- |
| `/prawf:review`           | 9인 team 평가 (P0 → R1 → R2 → R3 → ADJ) | `review-report.md` + `qa-sheet.md`             |
| `/prawf:simulate-defense` | 심사위원 질문 → 저자 답변 → 코칭        | 모의 Q&A 세션 + 코칭 노트                      |
| `/prawf:rebuttal`         | 외부 리뷰 코멘트 → 점대점 응답          | `rebuttal-letter.md` + `revision-checklist.md` |
| `/prawf:auto-fix`         | 리뷰의 자동수정 가능 항목을 원고에 적용 | `applied-fixes.md` + `manual-fixes.md`         |

`/prawf:review` 옵션: `--solo`(단일 패스 `adjudicator`), `--profile <name>`(분야
프로파일 override), `--scope <abstract|full>`, `--workdir <dir>`(산출물 루트 지정).

### Persona roster (10)

- Soundness 공격 (verdict-eligible): `argument-analyst`, `methodologist`,
  `statistical-auditor`, `causal-reviewer`, `bias-grader`, `integrity-auditor`.
- 중요성 (advisory): `impact-assessor`.
- 방어: `rebuttal-strategist`. 중재: `chair`. Solo 빠른 패스: `adjudicator`.

### Enums

- `verdict`: `accept | minor-revision | major-revision | reject`.
- finding `severity`: `critical | major | minor` (루브릭: critical = 신규 데이터 없이
  복구 불가; major = 기존 데이터 내 복구 가능; minor = 결론 불변).
- finding `status`: `raised → contested → defended | mitigated | unresolved | withdrawn`.
- `impact`: `high | moderate | low | niche` (advisory).
- `external_verification`: `complete | partial | unavailable`.

### Output location

산출물은 per-paper 디렉토리 `REVIEW_DIR = <WORKDIR>/review/<paper-slug>/` 에 쌓이며,
커스텀 프로파일은 `<WORKDIR>/profiles/<name>.yaml` 에서 읽는다. 4개 스킬이 같은
REVIEW_DIR 을 공유한다 — 한 논문의 review·defense·rebuttal·auto-fix 산출물이 한곳에 모인다.

### Deliverable filenames

`paper-profile.md`, `paper-normalized.md`, `findings/round-1-<axis>.md`,
`rebuttal.md`, `findings/round-3-<axis>.md`, `review-report.md`, `qa-sheet.md`
(review); `defense-session.md`(simulate-defense); `rebuttal-letter.md`,
`revision-checklist.md`(rebuttal); `applied-fixes.md`, `manual-fixes.md`(auto-fix).
모든 location 은 `paper-normalized.md` 좌표(`§<section>¶<paragraph>` + 줄)를 인용한다.

### Versioning

`version:sync` 는 `package.json` 버전을 `plugin.json` 에만 동기화한다(`src/version.ts`
없음). 루트 `scripts/inject-version.mjs` 는 `src/` 부재 시 version 파일 생성을 건너뛴다.
Changesets 버전 bump 후에는 `yarn prawf version:sync` 로 `plugin.json` 을 갱신한다.
