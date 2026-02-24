# Ogham

[![TypeScript](https://img.shields.io/badge/typescript-✔-blue.svg)]()
[![Claude Code](https://img.shields.io/badge/claude--code-plugin-purple.svg)]()
[![Node.js](https://img.shields.io/badge/node.js-20+-green.svg)]()

---

## 개요

**Ogham**은 Claude Code 플러그인과 AI 기반 개발자 도구를 위한 모노레포입니다. 모든 패키지는 TypeScript로 작성되어 있으며, Claude Code 에이전트의 동작을 확장하는 플러그인들을 제공합니다 — 프로젝트 구조 자동 관리부터 다중 페르소나 코드 리뷰까지.

---

## 빠른 시작 — Marketplace 설치

Ogham 플러그인을 사용하는 가장 간단한 방법은 Claude Code 플러그인 마켓플레이스를 통한 설치입니다.

```bash
# 1. 이 저장소를 마켓플레이스 소스로 등록
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. 플러그인 설치
claude plugin install filid
```

이것으로 끝입니다. 모든 컴포넌트(Skills, MCP 도구, Agents, Hooks)가 자동으로 등록되며, 별도의 설정이 필요 없습니다.

> 설치 후 Claude Code에서 바로 스킬을 사용할 수 있습니다. 예를 들어 `/filid:fca-init`을 입력하면 프로젝트에 FCA-AI를 초기화합니다.

---

## 플러그인

### [`@ogham/filid`](./packages/filid/) — FCA-AI 규칙 시행

**Fractal Context Architecture (FCA-AI)** 기반으로 프로젝트 구조와 문서를 자동으로 관리하는 Claude Code 플러그인입니다.

코드베이스가 커지면 AI 에이전트가 맥락을 잃고, 문서는 코드와 어긋나고, 디렉토리 구조는 일관성을 잃습니다. filid는 자동화된 규칙 시행으로 이 문제를 해결합니다.

**제공 컴포넌트:**

| 컴포넌트  | 수량 | 예시                                                       |
| --------- | ---- | ---------------------------------------------------------- |
| Skills    | 14   | `/filid:fca-init`, `/filid:fca-review`, `/filid:fca-scan` |
| MCP 도구  | 14   | 구조 분석, 드리프트 감지, 메트릭                           |
| Agents    | 7    | Architect, Implementer, QA Reviewer 등                     |
| Hooks     | 6    | 줄 수 제한 자동 검사, organ 보호, 규칙 주입                |

**주요 기능:**

- **다중 페르소나 코드 리뷰** — 특화된 리뷰어 위원회가 PR 변경사항에 대해 합의를 도출
- **자동 규칙 시행** — CLAUDE.md 줄 수 제한, 경계 섹션 검사, organ 디렉토리 보호
- **구조적 드리프트 감지** — 코드 변경이 문서화된 구조를 벗어나면 감지하고 자동 동기화
- **AST 기반 분석** — 모듈 응집도(LCOM4), 순환 복잡도, 순환 의존성 검출

```
# 프로젝트에 FCA-AI 초기화
/filid:fca-init

# 규칙 위반 스캔
/filid:fca-scan

# 현재 브랜치에 대해 다중 페르소나 코드 리뷰 실행
/filid:fca-review
```

자세한 문서는 [filid README (영문)](./packages/filid/README.md) 또는 [filid README (한글)](./packages/filid/README-ko_kr.md)을 참조하세요.

---

## 전체 패키지 목록

| 패키지                                   | 타입          | 버전   | 설명                                        |
| ---------------------------------------- | ------------- | ------ | ------------------------------------------- |
| **[`filid`](./packages/filid/)**         | Claude plugin | 0.0.12 | FCA-AI 규칙 시행 및 프랙탈 컨텍스트 관리    |

---

## 개발 환경 설정

```bash
# 저장소 클론
dir=your-ogham && git clone https://github.com/vincent-kk/ogham.git "$dir" && cd "$dir"

# 의존성 설치
nvm use && yarn install && yarn build:all

# yarn 워크스페이스 사용
yarn workspace <package-name> <command>

# 테스트 실행
yarn workspace <package-name> test

# 빌드
yarn workspace <package-name> build
```

---

## 호환성

이 패키지는 ECMAScript 2022 (ES2022) 문법으로 작성되었습니다.

ES2022를 지원하지 않는 JavaScript 환경을 사용하는 경우, 이 패키지를 트랜스파일 대상에 포함해야 합니다.

**지원 환경:**

- Node.js 20.0.0 이상

**레거시 환경 지원:**
Babel 같은 트랜스파일러를 사용하여 대상 환경에 맞게 코드를 변환하세요.

---

## 버전 관리

이 프로젝트는 [Changesets](https://github.com/changesets/changesets)를 사용하여 버전 관리와 배포를 합니다.

### Changeset 생성

패키지에 변경사항이 있을 때, changeset을 만들어 변경 내용을 기록합니다:

```bash
yarn changeset
```

### 릴리즈

```bash
# changeset 기반으로 패키지 버전 업데이트
yarn changeset:version

# npm에 패키지 배포
yarn changeset:publish
```

### Changeset 가이드라인

- **patch**: 버그 수정, 문서 업데이트, 내부 리팩토링
- **minor**: 새 기능, 새 export, 비파괴적 변경
- **major**: 파괴적 변경, 제거된 export, API 변경

---

## 스크립트

- `yarn build:all` — 전체 패키지 빌드
- `yarn test` — 전체 패키지 테스트 실행
- `yarn lint` — 코드 스타일 검사
- `yarn typecheck` — TypeScript 타입 검증
- `yarn changeset` — 새 changeset 생성
- `yarn changeset:version` — changeset 기반 버전 업데이트
- `yarn changeset:publish` — npm에 패키지 배포
- `yarn tag:packages <commit>` — 각 패키지 버전 기반으로 Git 태그 생성

---

## 라이선스

이 저장소는 MIT 라이선스로 제공됩니다. 자세한 내용은 [`LICENSE`](./LICENSE) 파일을 참조하세요.

---

## 문의

프로젝트에 대한 질문이나 제안이 있으시면 이슈를 생성해주세요.

[English documentation (README.md)](./README.md) is also available.
