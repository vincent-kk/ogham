# CLAUDE.md — @ogham/maencof-lens

`@ogham/maencof-lens` 패키지 작업 가이드. 패키지 contract (Purpose / Structure / Boundaries) 는 [INTENT.md](./INTENT.md) 참조.

## Commands

```bash
yarn build              # clean → version:sync → esbuild (mcp-server + hooks)
yarn build:plugin       # esbuild 번들만 (mcp-server + hooks)
yarn typecheck          # 타입 체크 (emit 없음)
yarn test:run           # 단일 실행 (CI)
yarn version:sync       # package.json → src/version.ts
```

## Development Notes

- **maencof handler 재사용**: `@ogham/maencof` (workspace dep) 의 read-only 핸들러 5개를 import 하여 multi-vault routing + layer filter 로 wrapping. 로직 중복 금지.
- **레이어 가드**: 모든 MCP 도구 호출에 vault config 와 호출 파라미터의 교집합 적용 — 우회 금지 (INTENT.md Boundaries 참조)
- **테스트**: `src/**/__tests__/**/*.test.ts`
- **훅 / build 변경 후**: `yarn build:plugin` 으로 재빌드
- **버전**: `src/version.ts` 직접 수정 금지 — `yarn version:sync` 사용

## References

`../../.metadata/maencof-lens/` — design-spec, blueprint, phase-specs, work-plan
