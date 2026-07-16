# testCoverageChecker -- 사용처별 대표 테스트 존재 여부 검증

## Purpose

`UsageSite[]`의 각 항목에 대해 대표 테스트 파일을 4-Strategy로 탐지하고,
`UsageCoverage[]`와 사람이 읽을 수 있는 경고 문자열을 생성한다.

## Strategies (우선순위 순, 앵커 = 소스 파일의 nearest `src` 루트)

1. **Co-located**: `<dir>/<name>.{test,spec}.{ts,tsx}`
2. **Mirror**: `<src>/<layer>/<name>.ts` → `<src>/__tests__/unit/<layer>/<name>.test.ts`
3. **Centralized**: `<src>/__tests__/**` 에서 basename 정확 일치 → 소유 fractal(최근접 INTENT.md 디렉터리) 이름 prefix 일치 — 평탄화·중앙집중 레이아웃 대응. 동명 fractal 존재 시 오귀속 가능 — 관측 시 path-scoped 매칭으로 업그레이드
4. **Integration**: `<src>/__tests__/integration/<name>*.{test,spec}.ts` — 모듈명 일치 또는 `<name>-` 시작

앵커를 `projectRoot/src` 로 두면 모노레포에서 2·4 가 발화 불가(false negative) — 반드시 파일 자신의 `src` 기준. 테스트 파일은 `countTestCases`로 검증하며 `total === 0`이면 발견 실패로 처리한다.

## Boundaries

### Always do

- 전략은 위 우선순위대로 시도하고 첫 성공에서 종료
- 파일 읽기 실패는 "미발견"으로 처리 (예외 전파 금지)
- 경고 메시지 포맷: `UNCOVERED: <file> imports [<names>] but has no representative test`

### Ask first

- 새로운 탐색 전략 추가 또는 우선순위 변경
- mirror 경로 규칙(`src/__tests__/unit/` 프리픽스) 변경
- `countTestCases` 외의 테스트 유효성 판정 도입

### Never do

- 테스트 파일 실행 또는 커버리지 수치(lines/branches) 측정
- `UsageSite` 수집 로직 인라인 (usageTracker 책임)
- 전략 외 경로 글로브로 테스트 추정
