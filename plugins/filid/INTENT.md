## Purpose

`@ogham/filid` 1.0 패키지 루트. 문서 계약, FCA 구조·DAG 검사, 읽기 전용 배치 계획과 FCA 범위 cross-review를 제공하는 독립 플러그인이다.

함수 분할, 명명, 파일 크기, 복잡도, 커버리지 품질, 일반 AST 편집, 파일 이동, import rewrite, commit·push·PR은 소유하지 않는다. 재구조화 도구는 계획하고 검증하며, 실제 변경은 외부 행위자가 수행한다.

## Structure

| Path                  | Role                                                  |
| --------------------- | ----------------------------------------------------- |
| `src/`                | 어댑터, FCA core, MCP, 훅 TypeScript canonical source |
| `skills/`             | 12개 사용자 workflow (merge-track 5 포함)             |
| `hooks/`              | 생성된 host hook mapping                              |
| `scripts/`            | rule/page/MCP/hook/plugin 생성 파이프라인             |
| `bridge/` · `public/` | 커밋되는 MCP·훅·설정 UI 생성물                        |
| `templates/`          | 문서 템플릿과 managed FCA rule canonical source       |
| plugin manifests      | plugin-compiler가 만드는 host별 생성물                |

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
