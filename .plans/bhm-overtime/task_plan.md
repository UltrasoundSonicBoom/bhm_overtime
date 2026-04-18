# BHM Overtime - Main Plan

> Status: PHASE-0 (Requirements Alignment)
> Created: 2026-04-17
> Updated: 2026-04-17
> Team: bhm-overtime (cc-full-stack-dev, cc-reviewer, cc-e2e-tester, cc-researcher, cc-growth-advisor)
> Decision Log: .plans/bhm-overtime/decisions.md
> **Deadline: 2026-04-30 (D-13) — 병원 게시판 배포 후 피드백 수집 시작**

---

## 1. Project Overview

SNUH Mate — 서울대병원 간호사 초과근무 수당 계산 및 규정 안내 웹앱.
현재 MVP 수준의 코드를 프로덕션 품질로 올려 실제 병원 직원에게 배포하고, 지속적으로 피드백 기반 개선을 진행한다.
**보안이 최우선 — 1인 비개발자가 만들었다는 이유로 보안 이슈가 지적되지 않아야 함.**

---

## 2. Docs Index

| Document | Location | Content |
|----------|----------|---------|
| Architecture | docs/architecture.md | 시스템 컴포넌트, 데이터 흐름, 기술 스택 |
| API Contracts | docs/api-contracts.md | 프론트-백엔드 인터페이스 정의 |
| Invariants | docs/invariants.md | 보안/데이터 불변 경계 |

---

## 3. Phases Overview

Task dispatch is managed via team-lead SendMessage. Dependencies tracked in `.plans/` files.

### Slicing Principle

Break tasks into **vertical slices** (tracer bullets), NOT horizontal slices by tech layer.

### Phases

- **Phase 0**: Requirements Alignment — cc-researcher 코드베이스 탐색, team-lead 사용자 정렬
- **Phase 1**: Security Audit & Production Readiness — 보안 감사, 크리티컬 수정
- **Phase 2**: Core Improvements — 기능 개선, 버그 수정, UX 최적화
- **Phase 3**: E2E Testing & Final Review — 통합 테스트, 최종 리뷰
- **Phase 4**: Deploy & Growth — 배포, 사용자 행동 분석, 마케팅 제안

---

## 4. Task Summary

| # | Task | Owner | Status | Plan File |
|---|------|-------|--------|-----------|
| T0a | 코드베이스 탐색 (아키텍처, 보안, 기술 부채) | cc-researcher | pending | .plans/bhm-overtime/cc-researcher/research-codebase/ |
| T0b | 사용자 요구사항 정렬 | team-lead | pending | — |
| T1a | 보안 감사 (OWASP Top 10) | cc-reviewer | blocked_by:T0a | .plans/bhm-overtime/cc-reviewer/ |
| T1b | 보안 이슈 수정 | cc-full-stack-dev | blocked_by:T1a | .plans/bhm-overtime/cc-full-stack-dev/ |
| T1c | 초기 UX/그로스 분석 | cc-growth-advisor | blocked_by:T0a | .plans/bhm-overtime/cc-growth-advisor/ |
| T2a | 핵심 기능 개선 & 버그 수정 | cc-full-stack-dev | blocked_by:T1b | — |
| T2b | 크리티컬 플로우 E2E 테스트 | cc-e2e-tester | blocked_by:T2a | — |
| T3a | 최종 코드 리뷰 | cc-reviewer | blocked_by:T2a | — |
| T3b | 리그레션 테스트 | cc-e2e-tester | blocked_by:T3a | — |

---

## 5. Current Phase

**Phase 0: Requirements Alignment**
- cc-researcher가 코드베이스를 탐색하여 현재 아키텍처, 보안 상태, 기술 부채를 파악
- 결과를 바탕으로 team-lead가 Phase 1 작업 범위 확정
