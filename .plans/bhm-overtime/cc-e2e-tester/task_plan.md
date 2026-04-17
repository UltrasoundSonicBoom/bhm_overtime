# cc-e2e-tester - Task Plan

> Role: E2E 테스터
> Status: pending
> Assigned Tasks: 크리티컬 플로우 테스트, 리그레션 테스트

## Tasks

- [ ] T2b: 크리티컬 플로우 E2E 테스트
- [ ] T3b: 배포 전 리그레션 테스트
- [ ] 추가 테스트는 team-lead가 배정

## Notes

- Playwright 사용
- 셀렉터 우선순위: getByRole > getByTestId > getByLabel > getByText
- waitForTimeout 금지 — 조건부 대기 사용
- 크리티컬 패스 100% 통과 목표
