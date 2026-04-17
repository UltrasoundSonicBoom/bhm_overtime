# Chrome Web Store 제출 자료

> 이 문서는 https://chrome.google.com/webstore/devconsole 에 등록할 때 복사-붙여넣기용입니다.

---

## 1. 스토어 목록 (Store Listing)

### 이름 (Name)
```
SNUH Mate Companion
```

### 요약 설명 (Summary) — 132자 이내
```
서울대병원 직원용 SNUH Mate 확장프로그램. 브라우저에서 바로 초과근무를 기록하고, 급여명세서 PDF를 한 클릭으로 가져옵니다.
```

### 상세 설명 (Description)
```
SNUH Mate Companion은 서울대학교병원(보라매병원 포함) 직원을 위한 SNUH Mate(snuhmate.com)의 공식 Chrome 확장프로그램입니다.

주요 기능:

🕐 빠른 초과근무 기록
• 브라우저 툴바에서 팝업을 열어 바로 기록
• 미니 캘린더에서 날짜 선택
• 시간외근무, 온콜대기, 온콜출근 3가지 타입 지원
• 시작/종료 시간, 메모, 공휴일 여부 설정
• 저장 즉시 SNUH Mate에 반영

📄 급여명세서 PDF 가져오기
• 현재 탭의 PDF를 한 클릭으로 SNUH Mate에 전달
• PDF 링크를 우클릭하여 "SNUH Mate로 PDF 가져오기"
• 최근 다운로드한 PDF를 자동 감지하여 빠르게 가져오기

🔒 보안
• Google 로그인 계정 일치 시에만 동작
• 모든 급여 계산은 SNUH Mate 페이지에서 처리 (확장프로그램 내 계산 없음)
• 데이터는 브라우저 내에서만 처리, 외부 서버 전송 없음

사용 방법:
1. SNUH Mate(snuhmate.com)에 Google 계정으로 로그인
2. 확장프로그램 아이콘 클릭
3. 날짜와 근무 타입 선택 후 저장

※ SNUH Mate 계정이 필요합니다. snuhmate.com에서 먼저 가입해주세요.
```

### 카테고리 (Category)
```
생산성 (Productivity)
```

### 언어 (Language)
```
한국어 (Korean)
```

---

## 2. 개인정보 보호 탭 (Privacy)

### 단일 목적 설명 (Single Purpose Description)
```
SNUH Mate 웹사이트(snuhmate.com)와 연동하여 브라우저 툴바에서 초과근무를 빠르게 기록하고, 급여명세서 PDF를 SNUH Mate로 전달하는 것이 이 확장프로그램의 단일 목적입니다.
```

### 권한 사유 (Permission Justifications)

#### tabs
```
SNUH Mate(snuhmate.com) 탭이 이미 열려있는지 확인하고, 없으면 새 탭을 생성하여 초과근무 기록이나 급여명세서 가져오기를 처리하기 위해 필요합니다. 현재 탭이 PDF인지 확인하는 데에도 사용됩니다.
```

#### scripting
```
SNUH Mate 페이지에 content script를 주입하여 확장프로그램과 페이지 간 메시지를 안전하게 중계하기 위해 필요합니다. snuhmate.com과 www.snuhmate.com에서만 실행됩니다.
```

#### storage
```
확장프로그램 설정(도메인, 디버그 모드)과 최근 다운로드된 PDF 정보를 브라우저 로컬에 저장하기 위해 필요합니다. 외부 서버로 전송되지 않습니다.
```

#### downloads
```
사용자가 PDF 파일을 다운로드 완료했을 때 이를 감지하여, 급여명세서일 경우 팝업에서 빠르게 SNUH Mate로 가져올 수 있도록 안내하기 위해 필요합니다.
```

#### contextMenus
```
PDF 링크를 우클릭했을 때 "SNUH Mate로 PDF 가져오기" 컨텍스트 메뉴 항목을 표시하기 위해 필요합니다. .pdf 확장자를 가진 링크에서만 표시됩니다.
```

#### notifications
```
백그라운드에서 PDF 가져오기 실패 등 오류가 발생했을 때 사용자에게 알림을 표시하기 위해 필요합니다.
```

#### host_permissions — snuhmate.com, www.snuhmate.com
```
SNUH Mate 페이지에서 content script를 실행하고, 확장프로그램과 페이지 간 메시지를 교환하기 위해 필요합니다. 이 확장프로그램은 snuhmate.com의 공식 도우미로, 해당 도메인에서만 동작합니다.
```

#### host_permissions — <all_urls>
```
사용자가 다른 웹사이트(예: 병원 인트라넷)에서 열어본 급여명세서 PDF를 가져올 때, 해당 URL에서 PDF 콘텐츠를 읽어오기 위해 필요합니다. PDF 가져오기 기능 외에는 다른 웹사이트에 접근하지 않습니다.
```

### 데이터 사용 인증 (Data Use Certifications)

아래 항목 모두 체크:
- [x] 개인정보를 판매하지 않습니다
- [x] 핵심 기능과 관련 없는 목적으로 사용하거나 전송하지 않습니다
- [x] 신용도 판단이나 대출 목적으로 사용하거나 전송하지 않습니다

### 개인정보처리방침 URL
```
https://snuhmate.com/chrome-extension/privacy-policy.html
```

---

## 3. 필요한 이미지 에셋

| 항목 | 크기 | 상태 |
|------|------|------|
| 아이콘 16px | 16×16 | ✅ `icons/icon16.png` |
| 아이콘 48px | 48×48 | ✅ `icons/icon48.png` |
| 아이콘 128px | 128×128 | ✅ `icons/icon128.png` |
| 스토어 아이콘 | 128×128 | ✅ `icons/icon128.png` 사용 |
| 스크린샷 (1~5장) | 1280×800 또는 640×400 | ⬜ 직접 캡처 필요 |
| 프로모션 타일 (선택) | 440×280 | ⬜ 선택사항 |

### 스크린샷 촬영 가이드
1. **팝업 전체** — 날짜 선택 + 시간외 타입 + 시간 입력 상태
2. **온콜대기 모드** — 온콜대기 버튼 활성화 상태
3. **PDF 가져오기** — PDF 페이지에서 팝업 열은 상태
4. **우클릭 메뉴** — PDF 링크에서 컨텍스트 메뉴 표시
5. **SNUH Mate 연동** — 확장프로그램으로 기록한 결과가 SNUH Mate에 반영된 화면

---

## 4. ZIP 패키징

스토어 제출 시 `chrome-extension/` 폴더를 ZIP으로 압축:

```bash
cd chrome-extension
zip -r ../snuh-mate-companion.zip . -x ".*" -x "STORE_LISTING.md"
```

---

## 5. `<all_urls>` 권한 축소 계획

현재 V1은 `<all_urls>`를 사용하지만, 심사에서 거부될 수 있습니다.
거부 시 아래 대안으로 전환:

```json
"host_permissions": [
  "https://snuhmate.com/*",
  "https://www.snuhmate.com/*",
  "https://*.snu.ac.kr/*",
  "https://*.snuh.org/*"
]
```

또는 `optional_host_permissions`를 사용하여 사용자가 필요할 때만 추가 권한을 부여:

```json
"optional_host_permissions": ["<all_urls>"]
```

이 경우 popup.js에서 `chrome.permissions.request()`를 호출하여 런타임에 권한 요청.
