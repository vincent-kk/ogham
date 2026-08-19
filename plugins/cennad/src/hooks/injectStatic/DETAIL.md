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

### AC-stance-strong-split — +2 분할 지시

- `+2` stance 는 분할 지시("Mixed work is split, not kept")와 작업장 사실 ("applies its own edits") 라인을 포함한다.
- 예외 목록은 정확히 4개의 닫힌 집합이다: (1) 명시적 자기지명, (2) 프롬프트로 전달 불가한 상태(workspace 파일 제외), (3) 1파일 ~20줄, (4) 동일 과업 dispatch 실패.

## Boundary Exemptions

### injectStatic.ts — E2E Layer A runs the hook in-process

- **Consumers**: `**/src/__tests__/**`
- **Direct import**: allowed
- **Reason**: e2e Layer A 는 훅을 번들 대신 in-process 로 실행해 payload 를 검사한다. 이 훅에는 배럴이 없고 있어서도 안 된다 — 번들 진입점이 배럴을 거치면 esbuild 가 재노출 그래프를 끌어와 크기 캡을 넘긴다.

## History

- 2026-08-16 — `+2` 예외 (1)·(2) 를 좁히고 분할 지시를 추가했다. (1) "asked this session" 은 모든 프롬프트에 성립해 예외 목록을 무력화했고, (2) "files, state, or tools" 는 세션이 길수록 자동 성립했다. 위임 산출물이 조언 텍스트로 인식되는 것을 막기 위해 workspace 직접 편집 사실을 명문화했다.

## Last Updated

2026-08-16 — +2 stance 분할 지시·닫힌 예외 정밀화를 계약에 반영했다.
