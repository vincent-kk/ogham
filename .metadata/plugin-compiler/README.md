# Plugin Compiler — 단일 정본에서 다중 호스트 플러그인 생성

> **Status**: 설계 단계 (design-only). 구현은 추후. 이 디렉터리는 설계 SSoT이며 코드가 아니다.

## 한 줄 요약

ogham 플러그인을 **하나의 호스트 중립 정본(IR)** 으로 기술하고, 빌드 시점에 **호스트별 산출물**(Claude Code · Codex · 향후 타 호스트)을 emit 하는 "플러그인 컴파일러"의 설계.

## 문제 정의

`plugins/*` 는 현재 Claude Code 전용이다. 조사 결과 Codex CLI 는 `.codex-plugin/plugin.json` 네이티브 플러그인 시스템과 Claude 호환 레이어(`.claude-plugin/marketplace.json` 읽기, `CLAUDE_PLUGIN_ROOT` 주입)를 갖춰 이식이 가능하지만, **파일을 그대로 복사하는 드롭인은 불가**하다. 매니페스트 파일명·`.mcp.json` 래퍼·도구명 형식·skill 호출 구문·hook 이벤트 집합이 다르기 때문이다.

두 호스트용 플러그인을 **별도 코드베이스로 포크하면** 런타임 로직과 워크플로 본문이 중복되어 동기화 부담이 생긴다. 그래서 **소스(정본) → 산출물(플러그인) 분리**, 즉 컴파일러 접근을 택한다.

## 핵심 결론 (조사 근거: [host-capability-matrix.md](./host-capability-matrix.md))

1. **런타임 로직(MCP 서버, hook 구현, src/bridge)은 호스트 중립** — 0 수정으로 양쪽 공유.
2. **호스트 차이는 두 층**이다. **스칼라 치환**(도구명·호출구문·경로)은 변수 바인딩으로 완전 해결되고, **구조 분기**(SessionEnd 부재·agents 번들 불가·이벤트셋)는 변수로 안 되며 호스트별 emitter/조건부로 빌드에 격리된다.
3. **단일 정본 + 호스트 프로파일 + emitter** 로 `tsc` 가 ESM/CJS 를 뽑듯 매니페스트를 Claude/Codex 로 뽑는다. 기존 `scripts/inject-version.mjs`("version 한 값 주입")의 자연스러운 일반화.

## 목표 / 비목표

**목표**

- 기존 런타임 코드(src/·bridge/) 무수정 재사용.
- 워크플로 본문(skill)·페르소나(agent) 정본 1벌 유지, 호스트별 산출물 생성.
- 새 호스트 추가 = 새 프로파일 + emitter (O(1) 확장).
- 결정적·재현 가능한 빌드 (스냅샷 검증).

**비목표**

- "단일 바이트-동일 산출물" (호스트별 매니페스트는 본질적으로 갈라진다).
- 모든 기능의 100% 동등성 (SessionEnd recap/commit 같은 호스트 고유 UX 는 절충).
- 런타임 동작의 호스트 추상화 (MCP 서버는 이미 중립이라 불필요).

## 문서 목차

| 문서                                                     | 내용                                                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [host-capability-matrix.md](./host-capability-matrix.md) | Claude↔Codex 메커니즘 매핑, 스칼라/구조 2층 차이, 도구명·이벤트 규칙, 출처·신뢰도              |
| [ir-schema.md](./ir-schema.md)                           | 정본 IR 스키마 — `plugin.yaml`, skill 토큰 규약, agent `bundle` 플래그, hook 정본              |
| [compiler-architecture.md](./compiler-architecture.md)   | 파이프라인, 호스트 프로파일, emitter, 디렉터리 레이아웃, 검증, 기존 빌드 통합                  |
| [case-studies.md](./case-studies.md)                     | deilen(스칼라 PoC) · filid(구조 분기: SessionEnd 재배선·agents dual-emit) · 로드맵 · 실측 항목 |

## 용어

- **정본 / IR (Intermediate Representation)**: 호스트 중립 플러그인 기술. `definitions/` 아래 위치.
- **호스트 프로파일 (host profile)**: 한 타깃 호스트의 규칙 집합 (도구명 포맷, 지원 이벤트, agent 전략, 경로 변수).
- **emitter**: 정본+프로파일 → 특정 산출물(매니페스트/`.mcp`/skill/agent/hook) 생성기.
- **스칼라 치환 / 구조 분기**: [host-capability-matrix.md](./host-capability-matrix.md) §2 의 2층 차이 모델.
