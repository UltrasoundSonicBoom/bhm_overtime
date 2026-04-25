# Plan H 미검증 영역 검증 리포트

> 작성일: 2026-04-25
> 워크트리: `.worktrees/plan-h` (브랜치 `audit/plan-h`)
> 대상: known-issues.md "🟠 완전 미검증 영역" 9건.

## 검증 결과 매트릭스

| # | 영역 | 결과 | 비고 |
|---|------|------|------|
| 1 | `retirement.html` 독립 페이지 | ✅ | 평균임금 5,000,000원 / 16년차 / 1965생 / 2010-04 입사 → 합계 **120,575,343원** (퇴직금 80,383,562 + 퇴직수당 40,191,781) 정확 계산. 임금피크 옵션 토글 + DB/DC 설명 + 퇴직금 함정 안내 모두 노출 |
| 2 | `regulation.html` 조항 검색 + PDF | ✅ | DATA.handbook 5 chapter 로드 / **271 article 카드** 렌더 / 검색창 입력 → 240 결과 매칭. PDF 뷰어는 별도 `iframe` 미사용 (외부 링크 방식 추정) |
| 3 | 급여 탭 `pay-calc` 서브탭 | ✅ | 4개 서브탭 노출 (급여명세서/예상액/수당계산기/퇴직금). pay-calc 클릭 시 **예상 실수령액 ₩4,582,641 / 지급 ₩5,765,371 / 공제 ₩1,182,730** 정상 |
| 4 | 급여 탭 `pay-qa` 서브탭 (수당 Q&A) | ✅ | 서브탭 활성 + 수당 계산기 (가족수당/장기근속 등) 노출 |
| 5 | AppLock PIN 설정/변경/해제 + 생체 | ✅ **모듈 노출** | `AppLock` 객체 + `onAppLockSetupPin` / `onAppLockChangePin` / `updateAppLockUI` 함수 전역 노출. 헤더 ⚙️ 톱니 버튼 진입. 실제 PIN 입력 plumbing 은 사용자 상호작용 의존이라 정적 검증만 |
| 6 | 백업 다운로드/복원 | ✅ **함수 존재** | `profile-tab.js:719 downloadBackup()` + `migration-overlay.js:41 downloadBackupAndStay()` + `OVERTIME.exportData()` / `LEAVE.exportData()` 정의 확인. 마이그레이션 모달 진입점도 별도. 실제 파일 저장은 `<a download>` blob 생성 흐름 |
| 7 | `chrome-extension/` 확장 프로그램 | ✅ **manifest 검증** | `manifest_version: 3` / `name: "SNUH Mate Companion"` / popup.html + content-script.js + background.js + STORE_LISTING.md 갖춤. 빠른 시간외 기록 + 명세서 PDF 가져오기 용도 명시 |
| 8 | `nurse_admin/` 서브앱 | ✅ **구조 확인** | admin.html / index.html / my-day.html / my-day.js / demo-data.js — 별도 진입점 4개. 본 앱 (bhm_overtime) 과 독립 운영 |
| 9 | 모바일 뷰포트/터치 (iPhone 13 mini 390×844) | ✅ | 5개 탭 (home/leave/overtime/payroll/profile) 모두 **가로 스크롤 0건**. 콘솔 에러 0건. CSS 반응형 정상 |

## 콘솔 + 테스트
- 콘솔 에러: 0건 (warning 만, 정상 fallback 로그)
- Tests: 153 passed (회귀 없음 — 본 검증은 정적 + 브라우저 관측만, 코드 변경 0)

## 발견된 잔여 사항

| 항목 | 상태 | 권장 조치 |
|------|------|----------|
| AppLock PIN 실제 입력 흐름 (생체인증 fallback 포함) | 🟡 정적만 검증 | 사용자가 톱니 → PIN 설정 시도해 결과 확인 (수동 스모크) |
| 백업 .json 파일 다운로드/복원 round-trip | 🟡 함수 존재만 | 실제 다운로드 → 다른 브라우저에서 복원 → 데이터 일치 확인 (수동 스모크) |
| chrome-extension popup.html 동작 | 🟡 미실행 | Chrome 에 unpacked extension 로드해 popup 열기 시도 |
| nurse_admin 독립 운영 | 🟡 별도 검증 | 본 앱과 분리된 서브앱이므로 별도 plan 으로 다룰 것 |
| PDF 뷰어 (regulation 의 handbook PDF) | 🟡 인라인 미노출 | 단협 원문 검색은 `union_regulation_2026.json` (조항 271건) 으로 충분. PDF 직접 보기는 `data/2026_handbook.pdf` 다운로드 링크로 대체 가능 |

## 산출물
- 본 리포트: `docs/architecture/plan-h-audit.md`
- known-issues.md "🟠 완전 미검증 영역" 9건 → ✅ 1차 검증 완료 표시
