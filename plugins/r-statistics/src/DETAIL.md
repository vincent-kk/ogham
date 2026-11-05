# src — Contract

## Requirements

- 레이어 의존 방향은 `mcp` → `core` → `types`/`constants`/`lib`/`utils` 한 방향이며 역방향 edge 는 0이다.
- 실행 안전(`core`)과 통계 정책(`mcp/tools/assertAnalysisPlan`)은 서로의 어휘를 갖지 않는다.
- 문자열 값집합은 `types/enums.ts`, 사용자 메시지는 `constants/messages.ts` 가 단일 출처다 — 인라인 리터럴을 두지 않는다.
- `version.ts` 는 `scripts/injectVersion.mjs` 가 만드는 생성물이며 손으로 고치지 않는다.
- ESM 전용이며 상대 import 는 `.js` 확장자를 쓴다.

## API Contracts

- 배포 표면은 실행 번들이다. 소스·중간 컴파일 출력은 npm 라이브러리 표면으로 약속하지 않는다.
- 루트 배럴은 버전과 공개 타입만 노출한다. MCP 재노출은 서버의 버전 참조가 루트로 돌아오는 순환을 만들므로 금지한다.
- 서버 수명주기와 도구 핸들러 표면은 MCP 경계가 소유한다.

## Acceptance Criteria

### AC-src-layering — 단방향 레이어

- `core/` 에서 `mcp/` 를 참조하는 import 가 0건이다.
- `core/` 에 통계 기법 이름·가정 판정이 없다.

### AC-src-single-source — 값 단일 출처

- 도구 등록명은 `constants/mcpToolNames.ts` 에서만 온다.
- 상태·모드 문자열은 `types/enums.ts` 에서만 온다.

### AC-src-generated — 생성물 불가침

- `version.ts` 와 `bridge/` 에 손편집 흔적이 없다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: `version.ts` 는 `scripts/injectVersion.mjs` 가 생성하는 단일 상수 파일이고 아무것도 import 하지 않는다. `src/index.ts` 배럴을 경유시키면 `src → mcp → server → src` 순환이 생기는데, 이 상수 하나 때문에 배럴 의존을 만드는 것은 경계가 아니라 사이클을 사는 일이다.

## Last Updated

소스 계층·생성 버전·공개 배럴 경계의 내용이나 적용 범위가 바뀔 때 갱신한다.
