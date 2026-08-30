## Purpose

`@ogham/filid` 1.0 패키지 루트. 문서 계약, FCA 구조·DAG 검사, 읽기 전용 배치 계획과 FCA 범위 cross-review를 제공하는 독립 플러그인이다.

함수 분할, 명명, 파일 크기, 복잡도, 커버리지 품질, 일반 AST 편집, 파일 이동, import rewrite는 소유하지 않는다. merge-track은 FCA owner가 있는 변경만 문서 audit하고 non-FCA 범위는 보고하며, PR 게시 전 원격 branch가 뒤처졌으면 기본적으로 push한다. 재구조화 도구는 계획하고 검증하며, 실제 변경은 외부 행위자가 수행한다.

## Structure

정본과 배포 사본이 함께 커밋되어 트리만으로는 편집 지점을 알 수 없다. 규칙·MCP·훅·페이지는 canonical source에서 공식 build로 생성되며, manifest와 배포 사본은 직접 고치지 않는다.

## Conventions

- 판단 우선순위: 1. 증거의 확실성 2. FCA 경계 보존 3. 작은 응답과 이식성
- 빌드: `clean → version:sync → rules → pages → mcp → hooks → compile-plugin`
- 현재 생태계 리터럴은 `src/adapters/ecmascript/` 안에만 둔다.
- spec-document는 15, test-record는 32 cases cap을 적용한다.

## Boundaries

### Always do

- DETAIL.md를 코드보다 먼저 갱신하고 공개 경계 변경 시 INTENT.md도 갱신
- canonical source를 바꾼 뒤 공식 build로 생성물과 rule hash 동기화
- 구조 이동 기능은 정확한 계획과 검증 결과만 반환

### Ask first

- built-in rule 의미·severity 또는 1.0 공개 도구·스킬 표면 변경
- INTENT.md 50줄 cap과 DETAIL acceptance 계약 변경

### Never do

- 생성된 manifest, `bridge/`, `public/` 또는 버전 소스를 손편집
- MCP에서 파일 이동, import rewrite, commit, push, PR 생성 수행
- Seiri나 특정 생태계 parser를 core runtime dependency로 요구

## Dependencies

- 런타임: MCP SDK, Zod, Ogham 공통 host·artifact 도구
- 개발: Node.js ≥20, TypeScript, esbuild, Vitest, Playwright, Yarn workspaces
