# injectStatic — Contract

## Requirements

- 세션 시작 시 cennad home 의 `config.json` 을 읽어 provider 비율, crosscheck 명단(`Active providers`), 자동 라우팅 명단(`Auto-routing`), 강도별 stance, 도메인 소유자 표를 `additionalContext` 로 **1회** 출력한다.
- active config 를 JSON/object 로 읽을 수 없으면 기본 home 의 config 를 읽기 전용 fallback 으로 시도하고, 그마저 실패하면 defaults 로 진행한다.
- **세션을 절대 차단하지 않는다.** 어떤 실패에도 계속 진행한다.
- 진입점은 `injectStatic.entry.ts` 이며 esbuild 가 `bridge/*.mjs` 로 번들한다.

## API Contracts

- SessionStart 처리 — 정적 정책 블록을 `additionalContext` 로 1회 주입한다.

## Acceptance Criteria

### AC-static-once — 1회 주입

- 세션당 정적 정책이 한 번만 나온다.

### AC-never-block — 비차단

- config 부재·손상·읽기 실패에서도 세션이 진행된다.

### AC-fallback-order — fallback 순서

- active config 실패 시 기본 home config 를 읽기 전용으로 시도하고, 실패하면 defaults 를 쓴다.

## Boundary Exemptions

### injectStatic.ts — E2E Layer A runs the hook in-process

- **Consumers**: `**/src/__tests__/**`
- **Direct import**: allowed
- **Reason**: e2e Layer A 는 훅을 번들 대신 in-process 로 실행해 payload 를 검사한다. 이 훅에는 배럴이 없고 있어서도 안 된다 — 번들 진입점이 배럴을 거치면 esbuild 가 재노출 그래프를 끌어와 크기 캡을 넘긴다.

## Last Updated

2026-07-30 — SessionStart 정적 주입 계약과 e2e in-process 실행 면책을 문서화했다.
