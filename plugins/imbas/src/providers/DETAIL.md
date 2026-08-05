# providers — Contract

## Requirements

- 이슈 트래커별 파싱·변환 로직을 캡슐화하는 추상화 계층이다. 현재 구현체는 `github/` 하나다.
- 각 provider 는 독립 fractal 이다 — 자체 `INTENT.md` 와 `index.ts` 배럴을 갖는다. provider 내부 파일을 바깥에서 직접 import 하지 않는다.
- provider 함수는 순수 함수를 우선한다. 네트워크·파일·프로세스 I/O 는 이 계층에 두지 않는다 — 트래커 실행은 스킬 계층의 몫이다.
- provider 간 공유 로직을 성급히 추출하지 않는다. 두 번째 provider 가 생기기 전의 추출은 하나의 구현을 공용 계약으로 착각한 것이다.

## API Contracts

```typescript
export { parseLinks, type GithubLinks } from './github/index.js';
```

- 이 배럴은 각 provider 배럴의 심볼을 이름으로 재노출한다. 와일드카드를 쓰지 않는다 — provider 내부에 심볼이 추가되면 조용히 계층 계약이 넓어진다.
- 공개 타입은 `types/index.ts` 가 아니라 각 provider 배럴에서 나온다. provider 별 형태를 전역 타입 배럴에 올리면 provider 경계가 사라진다.
- 새 provider 를 더할 때 `INTENT.md` 의 Structure 표와 이 배럴을 같은 변경에서 갱신한다.

## Acceptance Criteria

### AC-providers-named-reexport — 명시 재노출

- `providers/index.ts` 에 `export *` 형태가 없다.
- 배럴이 노출하는 심볼이 각 provider 배럴의 공개 심볼 부분집합이다.

### AC-providers-no-io — I/O 부재

- `providers/**` 가 `node:fs` · `node:child_process` · 네트워크 클라이언트를 import 하지 않는다.

### AC-providers-boundary — provider 경계

- `providers/` 바깥의 파일이 `providers/<name>/` 내부 파일을 직접 import 하지 않는다.
- provider 하나가 다른 provider 디렉터리를 import 하지 않는다.

### AC-providers-structure-current — Structure 표 최신성

- `INTENT.md` 의 Structure 표에 나열된 디렉터리 집합이 실제 provider 디렉터리 집합과 같다.

## Last Updated

2026-08-06 — provider 추상화 계층의 재노출 규칙과 I/O 금지 경계를 최초 문서화했다.
