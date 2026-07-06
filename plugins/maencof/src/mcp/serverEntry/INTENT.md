# serverEntry

## Purpose

esbuild 번들 진입점. companion 레거시→정본 마이그레이션 1회 후 MCP 서버를 stdio 모드로 시작.

## Boundaries

### Always do

- bridge/mcp-server.cjs로 번들됨
- startServer() 호출 전에 `runCompanionMigration(getVaultPath())` 1회(멱등, best-effort)
- 마이그레이션 실패를 서버 기동으로 전파하지 않음(try/catch 격리)

### Ask first

- 진입점 로직 변경
- 기동 전 1회성 작업 추가

### Never do

- 서버 로직 직접 추가 (핸들러·등록은 server/)
