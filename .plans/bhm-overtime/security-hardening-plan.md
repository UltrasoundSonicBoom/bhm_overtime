# BHM Overtime 보안 강화 계획

> Date: 2026-04-17
> Source: cc-researcher (SEC-01~08) + cc-reviewer (SEC-09~18) 통합
> Deadline: 2026-04-30 배포 전 P0/P1 완료 필수

---

## 현황 요약

| 구분 | 건수 |
|------|------|
| 원래 발견 | 18건 (CRITICAL 4, HIGH 7, MEDIUM 5, LOW 2) |
| 이미 수정됨 | 4건 (SEC-01/02, SEC-03, SEC-11) |
| 수정 필요 | 14건 |

---

## 이미 수정된 항목 (Skip)

| ID | 제목 | 상태 | 비고 |
|----|------|------|------|
| SEC-01/02 | .env 파일 Git 추적 제외 | FIXED | .gitignore에 포함 확인 |
| SEC-03 | JWT 서명 미검증 | FIXED | jose 라이브러리로 HS256 검증 구현. 단, 프로덕션에서 SUPABASE_JWT_SECRET 설정 필수 |
| SEC-11 | Teams API 인증 미적용 | FIXED | optionalAuth + requireTeamRole() 적용됨 |
| - | CSP unsafe-eval | FIXED | 커밋 8b268eb에서 제거 |

---

## Phase 1: P0 — CRITICAL (배포 차단, D-13 내 필수)

### 1-1. SEC-04: CORS origin '*' 제거
- **파일:** server/src/index.ts:20
- **현재:** cors({ origin: '*' })
- **수정:** 프로덕션 도메인 화이트리스트로 제한
- **수정안:** origin을 환경별로 분기 — 프로덕션은 snuhmate.com만, 개발은 '*'
- **검증:** curl -H "Origin: https://evil.com" 요청 시 CORS 차단 확인

### 1-2. SEC-09: SSRF — cardNews.ts URL fetch 미검증
- **파일:** server/src/routes/cardNews.ts:52-70 (resolve), :72-84 (summarize)
- **현재:** 사용자 입력 URL을 검증 없이 fetch(url) 호출
- **위험:** 내부 네트워크 스캔, 클라우드 메타데이터 접근, localhost 접근
- **수정안:**
  1. URL 프로토콜 제한 (https:// 만 허용)
  2. private IP 차단 (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x)
  3. DNS rebinding 방어를 위한 resolved IP 검사
- **검증:** http://169.254.169.254/... 요청 시 400 반환

### 1-3. SEC-05/12: DOM XSS — 동적 콘텐츠 미이스케이프
- **파일:** app.js 4개소
  - L221: notice.md 렌더링 시 이스케이프 없이 DOM 삽입
  - L576: 에러 메시지 DOM 삽입
  - L1503: API 응답 메시지 DOM 삽입
  - L1752: 챗봇 참조 DOM 삽입
- **현재:** escapeHtml() 함수가 L7-15에 정의되어 있으나 사용 안 됨
- **수정:**
  - 에러 메시지/API 응답/챗봇 참조: escapeHtml() 적용 또는 textContent 사용
  - notice.md: DOMPurify 등 HTML sanitizer 사용 (마크다운 렌더링 필요)
- **검증:** XSS payload 포함 데이터로 렌더링 시도 시 실행되지 않음

### 1-4. SEC-06: 챗봇 메시지 길이 제한 없음
- **파일:** server/src/routes/chat.ts:35
- **현재:** message.trim() 빈 문자열만 체크
- **수정:** MAX_MESSAGE_LENGTH (2000자) 초과 시 400 반환
- **검증:** 2001자 메시지 전송 시 400 반환

---

## Phase 2: P1 — HIGH (배포 전 권장)

### 2-1. SEC-10: 보안 헤더 누락 — vercel.json 생성
- **현재:** vercel.json 없음
- **수정:** 프로젝트 루트에 vercel.json 생성
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: camera=(), microphone=(), geolocation=()
  - Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
- **검증:** Vercel preview deploy 후 curl -I 헤더 확인

### 2-2. SEC-13: Rate Limit 서버리스 무효화
- **파일:** server/src/routes/chat.ts (메모리 Map 기반)
- **현재:** 서버리스 환경에서 인스턴스마다 별도 Map이라 실질 제한 없음
- **수정 옵션:**
  - A) Vercel KV (Redis) 기반 rate limit (권장)
  - B) Upstash Redis adapter
  - C) Supabase에 rate limit 테이블 (간단하지만 지연)
- **검증:** 20회 연속 요청 시 429 반환

### 2-3. SEC-14: admin/nurse_admin 페이지 CSP 미설정
- **파일:** nurse_admin/index.html, admin/index.html
- **현재:** 별도 CSP meta 태그 없음
- **수정:** 각 HTML에 적절한 CSP meta 태그 추가
- **검증:** DevTools Console에서 CSP 위반 없음 확인

### 2-4. SEC-17: 규정 버전 활성화 트랜잭션 없음
- **파일:** server/src/routes/adminOps.ts:1142-1146
- **현재:** 두 SQL문이 트랜잭션 없이 순차 실행 (race condition)
- **수정:** sql.begin() 트랜잭션으로 래핑
- **검증:** 동시 활성화 요청 테스트

### 2-5. CSP 개선: localhost + unsafe-inline 정리
- **파일:** index.html:16-29
- **수정:**
  - connect-src에서 http://localhost:3001 제거 (프로덕션 빌드)
  - unsafe-inline을 nonce 기반으로 전환 검토 (장기)
- **검증:** 프로덕션 CSP에 localhost 없음 확인

---

## Phase 3: P2 — MEDIUM (배포 후 개선)

### 3-1. SEC-15: 런타임 DDL (CREATE TABLE IF NOT EXISTS)
- 애플리케이션 코드에서 DDL 제거하고 Drizzle 마이그레이션으로 이관
- 위험도: 낮음 (IF NOT EXISTS라 즉시 장애는 아님)

### 3-2. SEC-16: 챗봇 히스토리 다른 세션 조회
- 세션 격리 검증 및 user_id 기반 필터링 추가
- 히스토리 조회 API에 인증 필수 적용

### 3-3. SEC-07: 공공 API 키 하드코딩
- holidays.js:9의 공공데이터포털 키를 환경변수로 이동
- 공공 키라 위험도는 낮음

### 3-4. SEC-08: admin/ URL 서버 접근 제어
- robots.txt 차단만으로는 불충분
- Vercel middleware 또는 basic auth 추가 검토

---

## Phase 4: P3 — LOW (유지보수)

### 4-1. SEC-18: 에러 로그 민감 정보 노출
- 에러 핸들러에서 stack trace / DB 연결 문자열 마스킹

---

## 실행 순서 (권장)

```
Phase 1 (P0) — 4건
  1-1. CORS 화이트리스트         (10분)
  1-2. SSRF URL 검증            (30분)
  1-3. DOM XSS escapeHtml 적용  (1시간)
  1-4. 챗봇 길이 제한            (10분)

Phase 2 (P1) — 5건
  2-1. vercel.json 보안 헤더     (20분)
  2-2. Rate Limit 영속화        (1시간, KV 설정 포함)
  2-3. admin CSP 추가           (20분)
  2-4. 트랜잭션 래핑             (15분)
  2-5. CSP localhost 제거       (10분)

Phase 3 (P2) — 배포 후
Phase 4 (P3) — 유지보수
```

---

## 프로덕션 배포 전 체크리스트

- [ ] SUPABASE_JWT_SECRET Vercel 환경변수 설정 확인
- [ ] Phase 1 (P0) 4건 전부 수정 완료
- [ ] Phase 2 (P1) 5건 전부 수정 완료
- [ ] cc-reviewer T3a 최종 코드 리뷰 통과
- [ ] CORS, CSP, 보안 헤더 프로덕션 환경 검증
