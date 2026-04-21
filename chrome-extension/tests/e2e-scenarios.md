# SNUH Mate Extension E2E Test Scenarios

## 사전 요구사항: GCP 설정 (최초 1회)

1. `chrome://extensions` → SNUH Mate → ID 복사
2. Extension 팝업 DevTools 콘솔: `chrome.identity.getRedirectURL()`
   → 예: `https://abcdefgh.chromiumapp.org/`
3. GCP Console → APIs & Services → Credentials
   → Web Application client (`...dcbl`) 편집
   → **Authorized redirect URIs**에 위 URL 추가 → 저장

---

## 시나리오 A: 첫 로그인 (Drive에 PIN 없음)

**준비:** `chrome://extensions` → 확장 새로고침(🔄) → DevTools 콘솔: `chrome.storage.local.clear()`

- [ ] 팝업 열기 → 로그인 화면 표시
- [ ] Google 로그인 버튼 클릭 → 계정 선택 → 동의
  - `redirect_uri_mismatch` 에러 시: GCP 설정(사전 요구사항) 확인
- [ ] "XXX님, 환영합니다!" 문구 + PIN 설정 화면 즉시 표시
- [ ] PIN 4자리 입력 + 재입력 → 메인 앱 (시간외 탭)
- [ ] DevTools → Application → Extension Storage: `bhm_pin_hash` (64자) + `_web_token` 있음

---

## 시나리오 B: "나중에" 건너뛰기

- [ ] PIN 설정 화면 → "나중에" 버튼 → 메인 앱 진입
- [ ] 팝업 닫기 → 재오픈 → PIN 설정 화면 다시 표시 (로그인 유지됨)
- [ ] DevTools storage: `bhm_pin_hash` 없음

---

## 시나리오 C: snuhmate.com PIN 설정 후 Extension 로그인

**준비:** snuhmate.com 로그인 → 설정 탭 → PIN 설정 (같은 Google 계정)

- [ ] Extension 설정 → 로그아웃
- [ ] 재로그인 (같은 Google 계정)
- [ ] PIN 설정 화면 잠깐 표시 → 2~3초 내 자동으로 메인 앱 이동
- [ ] 팝업 닫기 → 재오픈 → PIN 입력 화면 표시
- [ ] snuhmate.com에서 설정한 PIN 입력 → 잠금 해제 성공

---

## 시나리오 D: 데이터 동기화 (Extension → snuhmate.com)

- [ ] Extension 시간외 탭 → 기록 저장
- [ ] 설정 → "지금 동기화" → ✅ 완료 (❌ 아님)
- [ ] snuhmate.com 로그인 → 동일 기록 확인

---

## 시나리오 E: 로그아웃 완전 삭제

- [ ] Extension 설정 → 로그아웃 (확인 다이얼로그 → 확인)
- [ ] DevTools → Application → Extension Storage: `bhm_*` 키 없음, `_web_token` 없음
- [ ] 급여명세서 탭 (재로그인 후) → 최근 감지된 PDF 없음
- [ ] 재로그인 → 이전 사용자 데이터 없음 (빈 상태)
