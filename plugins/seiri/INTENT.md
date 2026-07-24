# seiri — 에이전트가 파악하기 좋은 코드를 위한 규칙

## Purpose

코드 작성 품질·리뷰 규율·개발 방법론 규칙을 대상 저장소의 `.claude/rules/` 로
배포하는 Claude Code 플러그인. 특정 아키텍처에 종속되지 않고 단독 동작한다.
**규칙 본문은 주입하지 않는다** — 배포 파일은 하니스가 세션마다 로드한다.

## Structure

| Path                         | Role                                                               |
| ---------------------------- | ------------------------------------------------------------------ |
| `src/`                       | TypeScript 소스 (fractal 루트)                                     |
| `templates/rules/`           | 배포되는 규칙 문서 + `manifest.json`                               |
| `templates/gates/`           | 저장소 게이트 placeholder 골격 (값 없음)                           |
| `skills/`                    | 스킬 (호출·자동, 작업 주기 전 구간) — 목록 정본은 `SHIPPED_SKILLS` |
| `hooks/hooks.json`           | 등록 4 · 5 이벤트 (InstructionsLoaded 만 dormant)                  |
| `libs/run.cjs`               | cross-platform 훅 러너                                             |
| `scripts/`                   | esbuild 번들 + 규칙 해시 동기화                                    |
| `bridge/` · `public/`        | 빌드 산출물 (커밋 대상)                                            |
| `.claude-plugin/plugin.json` | 플러그인 매니페스트 — **`agents` 없음**                            |

## Conventions

- 빌드: `clean → version:sync → sync-rule-hashes → settings-html → tsc → mcp-server → hooks`
- 규모 목표: MCP 도구 ≤3 · 훅 번들 5 · 에이전트 0 · 스킬 `SKILL.md` 각 ≤2KB
  (`references/`는 별도) · 규칙 각 <200줄.
  `src/__tests__/size.test.ts` 가 기계 검사한다.
- `templates/rules/*.md` 는 raw 바이트로 해시된다 — 루트 `.gitattributes`(LF
  고정)와 루트 `.prettierignore`(포매터 차단)가 그 전제를 지킨다.

## Boundaries

### Always do

- 빌드 후 `bridge/`·`public/` 커밋 (`package.json:files` 포함).
- 규칙 파일 변경은 `plan` 으로 먼저 보여줄 수 있게 유지.

### Ask first

- 새 규칙 추가 (무지침 대조군 micro-test 통과가 선행 조건).
- MCP 도구·훅 추가 (상시 컨텍스트 비용 증가).

### Never do

- 아키텍처 강제(filid) · 에이전트 오케스트레이션 · 작업 분해(imbas) ·
  지식 관리(maencof) · 알림 · 상태 표시 — **역할 밖**.
- 저장소의 진실(검증 명령·임계치) 보유 — 저장소가 소유한다.
- 차단 훅 도입 · 규칙 본문 주입 · 확인 없는 규칙 파일 쓰기.
