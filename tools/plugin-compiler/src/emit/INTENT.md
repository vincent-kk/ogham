## Purpose

`PluginIR` + `HostProfile` → 한 호스트의 자기완결 `FileMap` 을 생성하는 fractal. 순수 — 디스크 미접촉. 호스트 분기는 프로파일에 위임하고 emitter 는 조립만.

## Structure

| Path                           | Role                                                           |
| ------------------------------ | -------------------------------------------------------------- |
| `index.ts`                     | barrel — `emitPlugin` · `lintSkillTokens`                      |
| `steps/emitPlugin.ts`          | 오케스트레이터: 전 산출물 병합                                 |
| `steps/emitManifest.ts`        | 매니페스트 JSON (프로파일 buildManifest)                       |
| `steps/emitMcp.ts`             | MCP 설정 JSON (프로파일 buildMcp)                              |
| `steps/emitSkill.ts`           | SKILL.md 토큰 치환 + frontmatter 필터 + 지원파일               |
| `steps/emitAgents.ts`          | agent md(claude/agy) 또는 toml(codex) 생성                     |
| `steps/buildAgentToml.ts`      | AgentIR → Codex `.codex-agents/*.toml`(sandbox_mode)           |
| `steps/emitHooks.ts`           | claude=hooks.json 재현 / agy=named-group 재배선 / codex=미생성 |
| `steps/emitAssets.ts`          | bridge/·libs/·README verbatim 복사 (호스트 중립)               |
| `steps/dropFrontmatterKeys.ts` | 라인 단위 frontmatter 키 제거 (재직렬화 없음)                  |
| `steps/resolverFor.ts`         | 프로파일 → TokenResolver (skill·agent 공유)                    |
| `lint/lintSkillTokens.ts`      | 스킬 .md 의 미해결 예약토큰(`{{tool:}}` 등) 검사               |
| `lint/lintHooks.ts`            | 호스트별 훅 드롭/재배선 손실 경고(SessionEnd·Codex 전량 등)    |

## Conventions

- JSON 은 `json/stableJson` 단일 경로 (2-space + 개행). 등가 게이트는 JSON 을 의미 비교.
- SKILL.md·agent .md·`.md` 지원파일만 토큰 치환, 그 외 지원파일·assets 는 바이트 그대로.
- Codex 는 훅을 생성하지 않는다(선언 시 세션 행, 실측). agy 는 `fallback` 기반 매핑 — **SessionEnd 는 `Stop`(매 턴 발화)으로 재배선하지 않고 드롭**(MCP-기동 sweep 보상). 드롭/재배선 손실은 `lint/lintHooks` 가 경고로 표면화.
- key 충돌 시 나중 step 이 우선 (실제 충돌은 없어야 함).

## Boundaries

### Always do

- emit 은 순수 `FileMap` 반환 — I/O 는 pipeline.
- 도구/스킬/pluginRoot 참조는 프로파일 resolver 경유.

### Ask first

- 새 산출물 종류 emitter 추가 (예: LSP, monitors).

### Never do

- 호스트 이름 하드코딩 분기 (프로파일 소관).
- `.md` 외 파일에 토큰 치환 적용.

## Dependencies

- `json/stableJson`, `tokens/{substituteTokens,findUnresolvedTokens}`, `types/{ir,output,profile}`.
