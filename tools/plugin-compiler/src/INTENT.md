## Purpose

`@ogham/plugin-compiler` 소스 루트. **Claude 정본 → facts → 어댑터 내용 → 디스크 반영**의 단방향 파이프라인이며, 진입은 `main.ts` (`sync [--check] [pluginDir ...]`).

## Structure

| Path         | Role                                                         |
| ------------ | ------------------------------------------------------------ |
| `main.ts`    | CLI 진입 — 계획 수립 → 반영 → 출력 → exit 코드 판정          |
| `types/`     | organ: 정본 형태(source) · facts · 계획(plan) 계약           |
| `constants/` | organ: Claude 산출물 경로 · 어댑터 경로 · 호스트 마커/이벤트 |
| `utils/`     | organ: `stableJson` 결정적 직렬화                            |
| `cli/`       | fractal: 인자 파싱 · 진단/액션 포맷 (순수)                   |
| `facts/`     | fractal: Claude 정본 → facts (읽기 전용)                     |
| `adapters/`  | fractal: facts → 어댑터 파일 내용 (순수)                     |
| `lint/`      | fractal: 호환성 진단 (훅 이벤트 · matcher)                   |
| `pipeline/`  | fractal: 대상 열거 · 계획 · 쓰기/검사 (유일한 쓰기 지점)     |

## Conventions

- ESM, import 확장자 `.js`; 디렉터리·파일은 camelCase.
- fractal 소비는 배럴(`index.ts`) 경유, organ 소비는 concrete 파일 직접 import.
- 부수효과는 `pipeline/`(디스크)과 `main.ts`(스트림·exit) 두 곳뿐 — 나머지는 순수 함수.
- 스펙은 대상 fractal 의 `__tests__/` 에 둔다 (organ 하위에 새로 만들지 않는다).

## Boundaries

### Always do

- JSON emit 은 `utils/stableJson`(2-space + 개행) 단일 경로 — 재실행 무변경(결정성).

### Ask first

- 새 하위 fractal 추가 · facts 계약(`types/`) 확장 — adapters·lint 소비처 전체에 영향.

### Never do

- Claude 소비 파일 쓰기 — 쓰기 대상은 어댑터 경로 상수로 한정.
- `adapters/`·`lint/`·`cli/` 에서의 디스크 I/O.

## Dependencies

- Node.js ≥ 20 내장 모듈만 (`fs`·`path`·`url`·`process`) — 런타임 외부 의존성 없음.
