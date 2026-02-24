# ogham

Claude Code 플러그인 모노레포. AI 에이전트 워크플로우 확장 도구 모음.

## Project Structure

- **Monorepo**: Yarn 4.12 workspaces (`packages/*`)
- **Package**: `@ogham/filid` — FCA-AI rule enforcement Claude Code plugin (v0.0.12)

```
packages/filid/
├── src/
│   ├── index.ts            # 라이브러리 export (94개 함수/상수)
│   ├── version.ts          # 자동 생성 버전 (직접 수정 금지)
│   ├── core/               # FractalTree, RuleEngine, DriftDetector 등 12개 핵심 모듈
│   ├── ast/                # @ast-grep/napi AST 분석 (LCOM4, CC, 의존성)
│   ├── mcp/                # MCP 서버 + 14개 도구 핸들러
│   ├── hooks/              # Claude Code 훅 구현체 + esbuild 진입점
│   ├── metrics/            # 테스트 밀도, 모듈 분리 결정 메트릭
│   ├── compress/           # 컨텍스트 압축 (가역/비가역)
│   ├── types/              # 타입 정의
│   └── __tests__/          # 테스트 (unit, integration, bench)
├── agents/                 # 7개 특화 에이전트 (architect, implementer 등)
├── skills/                 # 14개 Skills (/filid:fca-init, /filid:fca-review 등)
├── templates/              # FCA-AI 규칙 템플릿
├── .claude-plugin/         # 플러그인 매니페스트
└── .metadata/              # 설계 문서 (8개)
```

## Tech Stack

- TypeScript 5.7.2, Node.js >=20
- Build: tsc (ESM) + esbuild (CJS/ESM 번들)
- Test: Vitest 3.2
- MCP: @modelcontextprotocol/sdk
- AST: @ast-grep/napi (tree-sitter)
- Validation: Zod

## Commands

```bash
# 모노레포 전체
yarn build:all          # 전체 빌드
yarn test:run           # 전체 테스트
yarn typecheck          # TypeScript 타입 체크
yarn lint               # ESLint 검사

# filid 패키지
yarn filid build        # filid 빌드 (tsc + esbuild)
yarn filid build:plugin # esbuild 번들만
yarn filid test         # filid 테스트
yarn filid test:run     # 단일 실행
yarn filid bench:run    # 벤치마크
```

## Conventions

- ESM modules (`"type": "module"`)
- 버전: `scripts/inject-version.mjs`로 빌드 시 자동 주입
- 릴리즈: Changesets 기반 (`yarn changeset`)
