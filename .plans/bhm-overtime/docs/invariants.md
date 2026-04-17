# BHM Overtime - System Invariants

> 불변 시스템 경계. 이 중 하나라도 위반하면 = CRITICAL 버그.
> 보안이 최우선 — 모든 보안 경계는 자동화 테스트로 보호되어야 함.

## Security Boundaries

- INV-1: 사용자 인증 없이 민감 데이터 접근 불가 — Status: no test
- INV-2: API 키/시크릿은 환경변수로만 관리, 코드에 하드코딩 금지 — Status: no test
- INV-3: 사용자 입력은 반드시 sanitize 후 렌더링 (XSS 방지) — Status: no test
- INV-4: CORS 정책은 허용된 도메인만 — Status: no test

## Data Isolation

- INV-5: 다른 사용자의 급여 데이터에 접근 불가 — Status: no test

## Interface Contracts

- INV-6: 프론트-백엔드 API 필드명은 api-contracts.md와 일치해야 함 — Status: manual check

---

보안 감사(Phase 1) 결과에 따라 추가 invariant 항목이 등록될 예정.
