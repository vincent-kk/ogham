# src — Contract

## Requirements

- `index.ts` 가 `@ogham/maencof` 의 유일한 라이브러리 표면이다. 모든 export 를 이름으로 열거하며, 여기 없는 심볼은 계약이 아니다.
- `createServer` · `startServer` 는 이 표면에 없다. 실행 진입점은 esbuild 가 `mcp/serverEntry/serverEntry.ts` 에서 만드는 `bridge/mcp-server.cjs` 이고, 배럴이 `mcp/server` 를 끌어오면 `server.ts → version.ts` 참조와 맞물려 `src → mcp → mcp/server → src` 순환이 된다.
- 의존 방향은 한쪽이다. `core/` 는 `mcp/` · `hooks/` 에 의존하지 않고, `types/` 의 외부 의존은 스키마 검증용 zod와 호스트 간 경로 해석을 통일하는 @ogham/cross-platform으로 한정한다. 호스트별 경로 정규화를 다시 구현하지 않는다.
- 서브레이어 허용값은 `types/frontmatter.ts` 의 `SubLayerSchema` 하나가 소유한다. frontmatter 검증도 MCP 도구 스키마도 이 스키마에서 파생하며, 값 목록을 리터럴로 다시 적지 않는다 — `SubLayer` 타입만 좁히고 어딘가의 리터럴을 놓치면 그 자리는 폐기된 값을 계속 광고한다.
- `version.ts` 는 빌드 시 생성한다. 직접 수정하지 않는다.
- `bridge/` 산출물은 esbuild 가 만든다. 소스는 `src/hooks/<event>/<event>.entry.ts` 와 `src/mcp/serverEntry/serverEntry.ts` 이며 산출물을 손대지 않는다.
- `skills/.shared/host-configuration.md` 는 `core/hostConfigurationSurfaces` renderer가 만든다. canonical configuration skill과 changelog 감시는 같은 registry 결과를 소비하며 생성물을 직접 수정하지 않는다.
- vault 아키텍처는 v3(L3 sublayer + 평면 L5 임시 수용소 + 레이어 직교 hub 속성)를 기대한다. 기대 버전과 다른 vault 는 `core/architectureMigrator` 가 마이그레이션한다.
- 세션 마감은 MCP 서버 수명주기가 소유한다. 매 턴 UserPromptSubmit `session-touch` 가 `lastActivityAt` · `usageSnapshot` 을 기록하고, 서버 shutdown(동기 정밀)과 다음 부팅 `bootSweep`(보장)이 `sweepStaleSessions` 로 레코드를 마감하며 workIndex 당일 digest 를 `buildDailyDigest` 로 재생성한다.
- 세션 종료 기록의 주소는 sessionStore 하나다. `.maencof-meta/sessions/*.md` 나 dailynote `.md` 에는 기록하지 않는다.

## API Contracts

- `mergeStaleNodesIntoGraph`는 `mcp/server/middlewares`의 entry point에서 직접 재노출한다. `mcp/index.ts`가 `mcp/server`를 재노출하지 않기 때문이며, 서버 생성 함수를 끌어오지 않으므로 배럴의 순환 금지와 충돌하지 않는다.
- 라이브러리 표면은 실제 외부 소비자가 필요한 심볼만 승격한다. MCP의 전체 도구 집합을 그대로 공개하지 않는다.
- `SubLayerSchema`는 다른 패키지의 입력 스키마도 같은 허용값에서 파생하도록 공개한다. 타입만 좁히고 값 리터럴을 남겨 폐기된 값을 광고하는 드리프트를 막는다.

## Acceptance Criteria

### AC-enumerated-surface — 열거된 표면

- `index.ts` 가 모든 export 를 이름으로 적어, 내부 파일에 심볼을 더해도 공개 표면이 조용히 넓어지지 않는다.

### AC-no-server-in-barrel — 서버 비노출

- 배럴이 `createServer` · `startServer` 를 노출하지 않아 `src → mcp → mcp/server → src` 순환이 성립하지 않는다.

### AC-core-independent — core 독립

- `core/` 모듈이 `mcp/` · `hooks/` 를 import 하지 않는다.

### AC-types-dependency-free — types 무의존

- `types/` 의 외부 의존은 zod와 @ogham/cross-platform으로 한정하고, MCP·훅 수명주기를 끌어오지 않는다.

### AC-sublayer-single-source — 서브레이어 값 단일 소유

- `types/frontmatter.ts` 밖의 어떤 zod 스키마도 서브레이어 값을 리터럴로 열거하지 않고 `SubLayerSchema` 에서 파생한다.
- `SubLayerSchema` 가 배럴에 이름으로 올라가 다른 패키지가 가져다 쓸 수 있다.

### AC-generated-not-handwritten — 생성물 비수정

- `version.ts`, `bridge/` 산출물, shared host-configuration reference가 생성기 출력과 일치한다.

### AC-host-configuration-single-source — host 설정 표면 단일 소유

- canonical configuration skill, MCP instruction manager 교차 검증, changelog 감시가 `hostConfigurationSurfaces` 계약과 일치한다.

### AC-session-close-owned-by-mcp — 세션 마감 소유권

- 세션 마감이 MCP 서버 shutdown 과 다음 부팅 `bootSweep` 에서만 일어나고, 훅은 매 턴 touch 만 기록한다.

### AC-session-record-single-address — 세션 기록 단일 주소

- 세션 종료 기록이 sessionStore 밖(`.maencof-meta/sessions/*.md` · dailynote)에 남지 않는다.

## Boundary Exemptions

### `version.ts` — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: `allowed`
- **Reason**: 빌드가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 소비자를 `src/index.ts` 로 돌리면 하위 fractal 이 조상 배럴의 공개 표면 전체에 의존하게 되고, SessionStart 훅 소비자는 배럴 경유가 번들 크기 가드에 걸려 아예 불가능하다.

## Last Updated

공개 표면의 승격 정책·생성물 소유권·세션 수명주기 경계가 바뀔 때 갱신한다.
