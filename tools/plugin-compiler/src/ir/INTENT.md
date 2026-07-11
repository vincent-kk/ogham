## Purpose

`definitions/` 트리 → 호스트 중립 `PluginIR` 로 로드(`load/`)하고, 현행 산출물 → `definitions/` 로 역추출(`extract/`, 마이그레이션)하는 fractal. 어떤 호스트도 언급하지 않는다 — 순수 파싱/치환.

## Structure

| Path                            | Role                                                                   |
| ------------------------------- | ---------------------------------------------------------------------- |
| `index.ts`                      | barrel — `loadDefinitions` · `extractDefinitions` · `writeDefinitions` |
| `load/loadDefinitions.ts`       | 오케스트레이터: plugin.yaml + package.json(version) → IR               |
| `load/parsePluginYaml.ts`       | plugin.yaml → 매니페스트 필드 + mcp                                    |
| `load/parseSkill.ts`            | skill 디렉터리 → SkillIR (rawText 보존)                                |
| `load/parseAgent.ts`            | agent .md → AgentIR (rawText 보존, frontmatter 미파싱)                 |
| `load/parseHooks.ts`            | hooks.json → HookIR[] (event 별 fallback)                              |
| `load/readAssets.ts`            | ASSET_ENTRIES(bridge/libs/README/public/templates) verbatim            |
| `extract/extractDefinitions.ts` | 현행 산출물 → 정본 FileMap (도구명 토큰화 = Claude emit 역연산)        |
| `extract/tokenizeBody.ts`       | `mcp__plugin_<p>_<s>__<t>`→`{{tool}}`, `${ROOT}`→`{{pluginRoot}}`      |
| `extract/writeDefinitions.ts`   | 추출 FileMap → `definitions/` 쓰기                                     |

## Conventions

- version 은 `package.json` 단일 소스에서 읽는다 (plugin.yaml 에 두지 않음).
- SKILL.md·agent .md 는 rawText 로 통째 보존 — frontmatter 재직렬화 금지(토큰화된 `tools:` 그랜트는 유효 YAML 아님).
- 정본은 호스트 무지 — 토큰(`{{tool:}}`)은 파싱 시 치환하지 않고 그대로 둔다.

## Boundaries

### Always do

- 지원 파일(references/\*)은 바이트 보존해 `SkillIR.supportingFiles` 로.
- skill 은 SKILL.md 를 가진 비-dot 디렉터리만 인식(`.omc`·`INTENT.md` 등 제외는 `fsx/readTree`).

### Ask first

- `PluginManifestFields` 스키마 확장 (정본 IR 계약 영향).

### Never do

- 토큰 치환·호스트 분기 (emit 단계 소관).
- SKILL.md/agent .md parse-후-재직렬화.

## Dependencies

- `yaml`(파서), `fsx/readTree`, `constants/layout`, `json/stableJson`, `types/{ir,output}`.
