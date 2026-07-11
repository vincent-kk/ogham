## Purpose

`@ogham/plugin-compiler` 모노레포 내부 전용 빌드 도구. 하나의 호스트 중립 정본(`plugins/<pkg>/definitions/`)을 Claude Code · Codex · Antigravity 배포 트리(`plugins/<pkg>/targets/<host>/`)로 컴파일한다. 설계 SSoT 는 [`.metadata/plugin-compiler/`](../../.metadata/plugin-compiler/).

## Structure

| Path            | Role                                                   |
| --------------- | ------------------------------------------------------ |
| `src/main.ts`   | CLI 진입 (tsx 실행)                                    |
| `src/types/`    | organ: PluginIR · HostProfile 계약                     |
| `src/ir/`       | fractal: `definitions/` → PluginIR (parse + validate)  |
| `src/tokens/`   | organ(pure): `{{tool}}`/`{{skill}}` 치환 · 리터럴 린트 |
| `src/profiles/` | fractal: claude · codex · agy 호스트 규칙              |
| `src/emit/`     | fractal: PluginIR + Profile → FileMap                  |
| `src/pipeline/` | fractal: 단계 실행 + `targets/` 쓰기                   |
| `src/verify/`   | fractal: 바이트 등가성 게이트 (신뢰도 앵커)            |

## Conventions

- `tsx` 로 실행 — dist 빌드 산출물 없음 (`private: true`, npm 게시 금지).
- emit 은 순수 `FileMap` 반환 → 디스크 쓰기와 분리.
- 정본/산출물은 컴파일러가 아니라 각 플러그인 안(`definitions/`·`targets/`)에 위치.

## Boundaries

### Always do

- JSON emit 은 `stableJson`(키순서 고정 + 2-space + 개행) 단일 경로.
- SKILL.md 는 raw text 위 토큰 치환/라인 필터만 — 절대 parse-reserialize 금지.
- 새 호스트 = `profiles/<host>.ts` + emitter 보강 (정본 무수정).

### Ask first

- 정본 IR 스키마(`types/ir.ts`) 변경 — 전 플러그인 정본에 영향.
- `targets/` 커밋 정책 변경 (릴리스 전략).

### Never do

- Codex 타깃에 hooks 산출물 생성 (선언=세션 행, 실측).
- 산출물 손편집 (정본만 수정, CI clean-regen 강제).
- 훅 진입을 쉘 스크립트로 emit (`node <script>` 직접 호출 유지).

## Dependencies

- **개발**: `yaml ^2.6`, `typescript ^5.7`, `tsx`(루트) — Node.js ≥ 20, Yarn 4.12 workspaces.
- 테스트는 커밋하지 않는다(도구+스펙만). 검증 재현 절차는 [`.metadata/plugin-compiler/reproduction.md`](../../.metadata/plugin-compiler/reproduction.md).
