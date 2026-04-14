# SNUH 메이트 정식 Open 런칭 플랜

> Last Updated: 2026-04-14
> Owner: 김계환 (핵의학과)
> Status: **Phase 0 진행 중**

이 문서는 정식 open 까지의 단일 소스 오브 트루스다. 체크리스트는 통과 전엔 open 못 한다.

---

## 런칭 게이트 (8개)

| # | 게이트 | 현재 | 블록 조건 |
|---|--------|------|-----------|
| G1 | 메시징 일관성 (온보딩 ↔ 제품) | ✅ | Phase 0 에서 패치됨 |
| G2 | 다기기 동기화 신뢰 | ✅ | `visibilitychange` pull 추가됨 |
| G3 | 데이터 손실 zero 보장 | ✅ | orphan 복구 UI + beforeunload flush 추가 |
| G4 | 법무/준법 | ⚠️ | OAuth ✅, privacy.html ✅, terms.html ✅. 상표·도메인 이메일 잔여(선택) |
| G5 | First-run 경험 | ⚠️ | 권한 설명 모달 ✅. 수동 테스트(권한 거부/재로그인) 잔여 |
| G6 | Observability | ✅ | `supabase_launch_views.sql` 배포되면 통과 |
| G7 | 지원 채널 | ✅ | 채널톡 가동 중 (2026.04.10) |
| G8 | 획득 루프 | ⚠️ | 공유 링크/QR 추가 필요 |

---

## Phase 0 — 런칭 전 필수 (이번 주 중)

### [x] G1. 온보딩 메시징 재작성
- `onboarding.html` 히어로 카피 교체 (놓친 수당 훅)
- 창작자 인용 배지 히어로 하단 추가
- Section 2 pain tag 를 월급날 발화로 교체
- Section 6 Privacy 를 Google 연동 반영해 재작성
- 최종 CTA 3단 ladder (로그인 없이 시작 / 구글 연결 / 튜토리얼)

### [x] G2. 다기기 동기화 재수신
- `syncManager.js` 에 `pullOnResume()` 추가
- `visibilitychange` + `focus` 리스너 연결
- 20초 쿨다운으로 Drive API 과호출 방지

### [ ] G4. 법무 체크 (별도 트랙, 6주 전부터 시작해야 함)

**상표/로고 사용**
- [ ] "서울대학교병원" 문자열 사용 허가 확인 (원내 법무팀 또는 홍보팀)
- [ ] 로고 이미지 사용하지 않음(텍스트만) — `snuhmaterect.png` 는 자체 디자인인지 확인
- [ ] 문제 시 "SNUH" 만 사용하고 disclaimer 강화 (`terms.html`)

**개인정보 처리방침 검수**
- [x] `privacy.html` 의 Supabase 익명 통계 항목 명시 (수집 항목: 이벤트 타입, anon_id, user_agent, app_version, 90일 보관)
- [x] Google Drive 스코프 명시 (`drive.appdata`, `calendar.app.created`, `openid email profile`)
- [x] 데이터 보관 기간 명시 (app_events 90일 삭제 정책)
- [ ] 문의 이메일 공개 (현재 `stevegogothing@gmail.com` — 별도 도메인 메일 권장, 선택사항)

**책임 한계**
- [x] `terms.html` 에 계산 결과 참고용 disclaimer highlight-box 추가

### [x] G4-bis. Google OAuth verification — 완료 ✅

**2026-04-14 구글 Brand Verification 승인됨.** Project ID: snuhmate (914163950802).
100명 사용자 캡 해제. 정식 open 블로커 아님.

> 주의: 새 scope 추가 또는 OAuth consent screen 설정 변경 시 재신청 필요.

### [ ] G6. 관측 대시보드
- [ ] `supabase_launch_views.sql` Supabase Studio 에서 실행
- [ ] 데일리 체크 루틴: `v_dau_daily`, `v_error_rate_daily`, `v_top_errors_14d`
- [ ] 오류율 5% 초과 지속 시 알람 (수동 관찰이라도)

### [ ] G8. 공유 루프
- [ ] 앱 내 "공유하기" 버튼 (URL + QR)
- [ ] 공유 문구 기본값: "서울대병원 동료가 만든 급여/휴가 관리 도구. https://www.snuhmate.com"

### [x] G3 보강. 데이터 손실 방지 UX
- [x] `*_orphan_*` 백업 키를 사용자가 볼 수 있는 "복구" 메뉴 — 프로필 탭 하단에 접이식 (index.html)
- [x] 3초 debounce pending push 가 있을 때 `beforeunload` 에서 즉시 flush 시도 (syncManager.js)

### [x] G5. First-run 검증
- [x] 구글 권한 요청 다이얼로그 전에 Drive/Calendar 권한 설명 모달 추가 (index.html #googlePermissionDialog)
- [ ] 권한 거부했을 때도 앱이 완전 동작하는지 **수동 확인 필요**
- [ ] 로그아웃 후 재로그인 시 데이터 복구 흐름 **수동 확인 필요**

---

## Phase 1 — 소프트 런칭 (4/21-5/5, 2주)

**대상 제한:** 본인 부서 + 친한 동료 병동 2-3곳. **최대 50-80명**.

**목표 지표** (`supabase_launch_views.sql`):
- DAU 30+ 안정적
- D1 리텐션 > 40%
- 오류율 < 2%
- 명세서 파싱 성공률 > 90% (별도 계측 필요)

**중단 조건:**
- 오류율 5% 초과 48시간 지속
- 파싱 실패 신고 3건 이상 (채널톡)
- 데이터 손실 신고 1건이라도

**커뮤니케이션:** 채널톡 1:1. 원내 공지 금지.

---

## Phase 2 — 정식 Open (5/6 이후, OAuth verification 완료 조건)

**게이트:** G1-G8 모두 통과 AND Phase 1 에서 중단 조건 미발생 AND OAuth verified.

**공지 채널:**
- 간호본부 공지 협조 요청 (소프트런칭 피드백 근거)
- 핵의학과·방사선사회 등 창작자 접근 가능한 과 단위 공지
- 월급 25일 전후 시점 맞춤 채널톡 푸시

**캠페인 문구 후보** (A/B 테스트):
- "이번 달 명세서 받기 전, 내 수당 먼저 검증해보세요."
- "3월부터 4월까지 사용자 평균 N원 누락 발견 (실측 데이터 확보 후)"

**추천 보상 없음.** 영리 오해 방지.

---

## Not in scope (명시적 보류)

- iOS/Android 네이티브 앱 — 웹으로 충분
- 타 병원 확장 — 서울대병원 그룹이 wedge
- 유료화 — 브랜드 안정 전 금지
- 딥 캘린더 연동 — Phase 3+
- 팀 기능 (동료 간 휴가 공유 등) — 프라이버시 리스크, 보류

---

## 주요 리스크

| 리스크 | 확률 | 영향 | 대응 |
|-------|------|------|------|
| Google OAuth 미승인 (100명 캡) | ~~높음~~ → **제거** | — | **2026-04-14 Brand Verification 승인 완료** |
| "서울대병원" 상표 문제 | 중 | 중단 가능 | 법무/홍보 사전 면담 |
| 명세서 파서 edge case | 중 | 신뢰 훼손 | 수동 입력 fallback 확인 |
| 익명 통계 개인정보 오해 | 중 | 평판 | 스키마 공개, privacy.html 명시 |
| 간호본부·인사팀 반대 | 낮~중 | 공식 승인 차단 | 소프트런칭에서 사전 면담 |
| 계산 오류로 민원 | 중 | 신뢰+법적 | terms.html disclaimer + 수정 루프 |

---

## 변경 이력

| 날짜 | 변경 | 사유 |
|------|------|------|
| 2026-04-14 | 초기 작성 | /plan-ceo-review 세션에서 Phase 0 확정 |
