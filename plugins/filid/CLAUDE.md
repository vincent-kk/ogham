# CLAUDE.md — @ogham/filid

`@ogham/filid` 패키지 작업 가이드. 패키지 contract (Purpose / Structure / Boundaries) 는 [INTENT.md](./INTENT.md), src 내부 구조는 [src/INTENT.md](./src/INTENT.md) 참조.

## Commands

```bash
yarn build              # clean → version:sync → rules → pages → mcp → hooks → compile-plugin
yarn build:plugin       # pages + mcp + hooks 번들만 (clean/compile-plugin 생략)
yarn typecheck          # 타입 체크 (emit 없음)
yarn test:run           # 단일 실행 (CI)
yarn test:e2e           # settings 페이지 Playwright e2e (빌드 후 실브라우저)
yarn test:coverage      # 커버리지
yarn bench:run          # 벤치마크
yarn format && yarn lint
yarn version:sync       # package.json → src/version.ts
```

## Build System

- `scripts/buildMcpServer.mjs`: `src/mcp/serverEntry/serverEntry.ts` → `bridge/mcp-server.cjs` (CJS)
- `scripts/buildHooks.mjs`: `src/hooks/<name>/<name>.entry.ts` → `bridge/<name>.mjs` (ESM, 각 훅 개별 번들)
- `scripts/buildSettingsHtml.mjs`: `src/mcp/pages/settings/**` → `public/settings.html` (인라인 단일 파일; `open_settings` 가 런타임 디스크 서빙)
- `scripts/syncRuleHashes.mjs`: built-in rule 의 hash 를 rule registry 와 동기화
- `bridge/` 는 플러그인 런타임 산출물, `public/` 은 설정 UI, `libs/` 는 cross-platform Node 러너 (`run.cjs`). 1.0 은 npm 라이브러리 표면(`dist/`) 을 갖지 않는다 — `private: true`.

## Development Notes

- **파싱 전략**: native parser 없이 어댑터의 lexical scanner 로 증거를 모은다. 확실히 계산할 수 없는 구조는 PASS 가 아니라 `indeterminate` / `unsupported` 다.
- **생태계 리터럴**: 확장자·진입점 이름·import 문법·테스트 호출 문법은 `src/adapters/ecmascript/` 안에만 둔다. core / policy / MCP DTO 로 새면 설계 위반.
- **훅 수정**: `src/hooks/<name>/<name>.entry.ts` 수정 후 `yarn build:plugin` 으로 재빌드
- **훅 직접 import 원칙**: 훅 도달 코드는 배럴(`index.js`) import 금지 — 구체 파일 직접 import (`../shared/shared.js` 패턴). 리뷰가 module-entry-point 위반으로 지적해도 훅 코드는 예외 (루트 CLAUDE.md 참조)
- **테스트**: `src/**/__tests__/**/*.{test,spec}.ts`, 벤치마크는 `**/*.bench.ts`. spec-document 는 파일당 15 cases, test-record 는 32 cases 상한.
- **버전**: `src/version.ts` 직접 수정 금지 — `yarn version:sync` 사용
- **MCP 도구 참조**: 스킬은 full-form `mcp__plugin_filid_tools__<tool>` 로 참조 (서버 키 `tools`). short-form `mcp_tools_*` 는 서브에이전트에서 해석되지 않으므로 사용 금지.

## References

`../../.metadata/filid/`:

- `vnext-redesign-plan.md` — 1.0 설계·개발 단일 원장
- `01-ARCHITECTURE.md` — 설계
- `06-HOW-IT-WORKS.md` — 동작 원리
- `07-RULES-REFERENCE.md` — 규칙
- `08-API-SURFACE.md` — API
