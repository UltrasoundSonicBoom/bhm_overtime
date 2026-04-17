# T0a Progress Log

## 2026-04-17 Session 1

### 완료된 작업
1. 루트 디렉토리 구조 파악 (총 ~70개 파일/디렉토리)
2. package.json: 루트 = 빈 객체 (서버리스 프론트), server/ = Hono + Drizzle + OpenAI
3. supabaseClient.js 분석: 익명 텔레메트리 전용, PII 없음
4. googleAuth.js 분석: GIS Implicit Flow, allowlist 기반 제어
5. app.js 분석: escapeHtml() 함수 존재하나 일부 innerHTML에 미적용
6. server CORS: origin '*' → 광범위 허용
7. JWT 검증: SUPABASE_JWT_SECRET 미설정 시 서명 미검증 (dev fallback)
8. server/.env: 실제 DB 비밀번호 + OpenAI API 키 평문 노출 확인

### 크리티컬 발견
- **SEC-01**: server/.env에 실제 자격증명 (DATABASE_URL, OPENAI_API_KEY)
- **SEC-02**: root .env에 SUPABASE_DB_PASSWORD, PAT, Google OAuth Secret 모두 노출
- **SEC-03**: SUPABASE_JWT_SECRET 미설정 → auth.ts 서명 미검증 모드 동작
- **SEC-04**: CORS `origin: '*'` → 모든 출처 허용
- **SEC-05**: notice.md 내용이 escapeHtml 없이 innerHTML에 직접 삽입
- **INFO-01**: holidays.js에 공공 API 키 하드코딩 (공공데이터포털 — 낮은 위험)

### 다음 작업
- server routes 나머지 확인 (me.ts, resume.ts)
- findings.md 상세 작성
