# Phase 2: Boundary 감지 + 맥락 체인 구성

> 상태: 미결 사항 결정 필요

## 목표

파일 접근 시 해당 파일의 프랙탈 체인(조상 INTENT.md 경로 목록)을 구성할 수 있도록,
프로젝트 루트 boundary 탐지와 조상 방향 체인 구성 로직을 구현한다.

## 선행 조건

- Phase 1 완료 (INTENT.md 이름 확정)

## 핵심 기능

### 1. 프로젝트 루트 탐지

`.git`, `package.json`, `tsconfig.json` 존재 디렉토리를 프로젝트 루트로 인식.
boundary를 넘어서는 조상 탐색 중단.

### 2. 조상 체인 구성

파일 경로가 주어지면, 해당 디렉토리부터 프로젝트 루트까지의 INTENT.md 경로 목록을 반환:

```typescript
// 입력: src/payment/checkout/handler.ts
// 출력:
{
  chain: ["./", "src/", "src/payment/", "src/payment/checkout/"],
  intents: {
    "./INTENT.md": exists,
    "src/INTENT.md": exists,
    "src/payment/INTENT.md": exists,
    "src/payment/checkout/INTENT.md": exists
  }
}
```

### 3. 형제 프랙탈 힌트 (선택)

같은 레벨의 형제 디렉토리 중 INTENT.md가 있는 것을 목록화.
주입하지는 않지만, 존재 여부를 메타데이터로 제공.

## ⚠️ 미결 사항: 모노레포 서브 boundary

```
monorepo/
├── package.json          ← 루트 boundary
└── packages/
    └── payment/
        ├── package.json  ← 서브 boundary
        └── src/
            └── handler.ts
```

`handler.ts` 접근 시:
- **Option A**: `packages/payment/package.json`에서 멈춤 → 루트 INTENT.md 주입 안 됨
- **Option B**: 루트까지 올라감 → 서브 boundary 무시
- **Option C**: 서브 boundary까지 기본, 루트까지는 설정으로 opt-in

**결정 필요**: 어떤 정책을 따를 것인지.

## 기존 코드 활용 가능성

- `src/core/fractal-tree.ts` — 이미 프로젝트 스캔 + boundary 감지 일부 구현
- `src/hooks/shared.ts` — `isFcaProject()` 루트 판별

## 산출물

- `BoundaryDetector` 모듈 (또는 fractal-tree 확장)
- `buildChain(filePath: string): ChainResult` 함수
- 모노레포 서브 boundary 정책 결정 문서
