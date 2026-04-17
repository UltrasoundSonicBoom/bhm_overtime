# SNUH Mate Chrome Extension Companion

## 설치 방법

1. `chrome://extensions` 접속
2. **개발자 모드** 활성화 (우측 상단 토글)
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. `chrome-extension/` 폴더 선택
5. 확장프로그램이 설치되면 브라우저 우측 상단에 아이콘 표시

## 필수 조건

- **Google 로그인 필수**: SNUH Mate에 Google 계정으로 로그인된 상태여야 합니다
- 로그인된 계정과 SNUH Mate 계정이 반드시 일치해야 합니다

## 권한 설명

| 권한 | 용도 |
|------|------|
| `tabs` | SNUH Mate 탭 찾기/생성 |
| `scripting` | content script 주입 |
| `storage` | 설정 + 최근 PDF 저장 |
| `downloads` | PDF 다운로드 감지 |
| `contextMenus` | 우클릭 PDF 가져오기 |
| `notifications` | 에러 알림 |

## 기능

### 1. 빠른 기록 (Quick Capture)

확장프로그램 아이콘 클릭 → 팝업에서:
- 미니 캘린더로 날짜 선택
- 근무 타입 선택 (시간외 / 온콜대기 / 온콜출근)
- 시작/종료 시간 입력
- 저장 → SNUH Mate의 `OVERTIME.createRecord()`를 통해 기록

### 2. PDF 급여명세서 가져오기

세 가지 진입점:
1. **현재 탭 PDF**: 팝업에서 "현재 탭 PDF 가져오기" 클릭
2. **PDF 링크 우클릭**: 링크에서 "SNUH Mate로 PDF 가져오기" 선택
3. **최근 다운로드 PDF**: 팝업에서 자동 표시되는 최근 PDF 클릭

## 디버깅 체크리스트

- [ ] `chrome://extensions`에서 확장프로그램 에러 없음 확인
- [ ] SNUH Mate에 Google 로그인 상태 확인
- [ ] 팝업 → 우클릭 → 검사 → Console 탭에서 에러 확인
- [ ] background service worker: `chrome://extensions` → 확장프로그램 → "서비스 워커" 클릭
- [ ] content script: SNUH Mate 페이지 F12 → Console에서 `SnuhmateExtensionBridge` 확인

## V1 한계 (의도적 제외)

- 로컬 디스크의 임의 PDF를 직접 가져오기 (브라우저가 URL을 잃은 후)
- 과거 다운로드 폴더 스캔
- 확장프로그램 내 급여 계산 로직 실행 (모든 비즈니스 로직은 SNUH Mate 페이지 위임)

## 아키텍처

```
[Popup] → chrome.runtime.sendMessage → [Background SW]
                                            ↓
                                  ensureSnuhmateTab()
                                            ↓
                            chrome.tabs.sendMessage → [Content Script]
                                                          ↓
                                                window.postMessage → [extensionBridge.js]
                                                                          ↓
                                                              OVERTIME.createRecord()
                                                              handlePayslipUpload()
```
