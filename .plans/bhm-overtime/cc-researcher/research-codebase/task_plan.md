# T0a: 코드베이스 종합 탐색 — Task Plan

> Status: in_progress
> Started: 2026-04-17

## Goal
BHM Overtime (SNUH Mate) 프로젝트의 현재 상태를 종합 파악하여 Phase 1(보안 감사) 준비.

## Steps

### Phase 1: 초기 탐색 (완료)
- [x] 루트 디렉토리 구조 파악
- [x] package.json, config.js 확인
- [x] supabaseClient.js 확인
- [x] googleAuth.js 확인
- [x] app.js (상위 100줄) 확인
- [x] server/src/index.ts 확인
- [x] server/src/middleware/auth.ts 확인
- [x] server/src/routes/adminOps.ts 확인
- [x] server/.env 확인 → **크리티컬 이슈 발견**
- [x] .gitignore 확인

### Phase 2: 보안 심층 탐색 (진행 중)
- [x] CORS 설정 확인
- [x] JWT 검증 로직 확인
- [x] 하드코딩 API 키 검색
- [x] innerHTML XSS 위험 검색
- [x] notice.md / CHANGELOG.md → innerHTML 비검증 삽입 발견
- [ ] 나머지 server routes 보안 확인 (me.ts, resume.ts 등)
- [ ] Supabase RLS 상태 심층 확인

### Phase 3: 기술 부채 탐색
- [ ] 800줄 이상 파일 목록 완성
- [ ] TODO/FIXME 전체 목록
- [ ] 미사용 코드 검색

### Phase 4: 배포 구성 확인
- [ ] Vercel 설정 확인
- [ ] 환경 변수 관리 방식 최종 정리

## Findings 파일
→ findings.md (동일 폴더)
