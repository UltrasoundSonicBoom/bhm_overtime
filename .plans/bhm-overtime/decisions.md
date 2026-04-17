# BHM Overtime - Architecture Decisions

> Record each decision with rationale. Located at .plans/bhm-overtime/decisions.md.

---

## D1: 보안 리뷰어 opus 모델 사용

- Date: 2026-04-17
- Decision: cc-reviewer를 opus 모델로 운영
- Rationale: 사용자가 보안을 최우선으로 지정. "1인 비개발자가 만들었다"는 이유로 보안 이슈 지적받지 않아야 함
- Alternatives considered: 전체 sonnet (비용 절감) — 보안 심층 분석에는 opus가 적합

## D2: 풀스택 개발자 통합 운영

- Date: 2026-04-17
- Decision: frontend-dev + backend-dev를 cc-full-stack-dev 1명으로 통합
- Rationale: 프로젝트 규모상 분리하면 오버헤드가 더 큼. 필요 시 분리 가능
- Alternatives considered: 분리 운영 — 현재 13일 타이트한 일정에 맞지 않음

## D3: growth-advisor 커스텀 역할

- Date: 2026-04-17
- Decision: 마케팅/CTA/UX 제안 전담 커스텀 역할 추가
- Rationale: 사용자의 1-3, 1-4 요구사항 (마케팅, 자율 개선 제안)을 충족
- Alternatives considered: researcher에 통합 — 역할이 명확히 다름 (기술 분석 vs 비즈니스 성장)
