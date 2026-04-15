# Timeline Spine 이식 플랜 — 근무이력 (info 탭)

**승인된 디자인:** Variant B · Timeline Spine
**원본:** `~/.gstack/projects/UltrasoundSonicBoom-bhm_overtime/designs/career-info-tab-20260415/variant-B.html`
**작성:** 2026-04-15
**목표:** 좌측 세로 spine + 연도 스탬프 + 재직 중 LIVE 세그먼트 + 인라인 로테이션 칩으로 기존 근무이력 카드를 대체한다.

---

## 1. 전제 및 설계 결정

### 유지 (Reuse)
- **데이터 스키마 그대로** — `bhm_work_history` localStorage, `{ id, workplace, dept, from, to, role, desc, rotations: [{id, room/name, from, to, tasks}] }` 구조 변경 없음. Spine은 순수 렌더 레이어 교체.
- **`workHistorySheet` 바텀시트 재사용** — 편집/추가 트리거만 spine의 세그먼트 메뉴로 이동. 시트 내부 DOM/JS 건들지 않음.
- **`rotationSheet` 재사용** — 인라인 "+" 칩이 기존 `openRotationSheet(parentId)` 호출.
- **`_effectivePeriod()`, `_seedFirstWorkFromProfile()`, `addRotation()` 등 유틸 전부 유지.**
- **SyncManager 흐름 유지** — `_saveWorkHistory` 그대로.

### 교체 (Replace)
- `_renderWorkHistoryCard(item)` (app.js:590–716) — 전체 DOM 생성 로직을 spine 세그먼트로 교체.
- `renderWorkHistory()` (app.js:524–563) — 컨테이너를 spine 래퍼로 감싸고, 연도 스탬프를 가장 오래된 연도까지 삽입.
- `_renderRotationCard(parent, rot)` (app.js:718~) — 칩 스타일로 축약 (현재는 박스 카드).

### 제거
- 카드 하단 중복 "편집/삭제" 버튼 (actions 블록, app.js:698–714) — kebab 메뉴(⋯)로 단일화.
- 📍 이모지 (app.js:624) — 민트 "LIVE" 인디케이터로 대체.
- "로테이션 2" 배지 (app.js:636–642) — 세그먼트 헤더에 "로테이션 N개"로 명시.

### 포맷 변경
- 날짜 표기: `2006-07` → `2006.07` — `_effectivePeriod` 결과를 렌더 시점에 `.replace(/-/g, '.')`.

---

## 2. 파일별 변경 요약

### `index.html` (최소)
- 라인 1810–1816 `#workHistoryCard` 헤더 그대로. `+ 추가` 버튼 라벨만 `+ 부서 추가`로 변경.
- `#workHistoryList` 그대로 유지 (spine은 이 컨테이너 내부에서 렌더).

### `style.css` (새 섹션 추가)
- Linear 테마(기본) + Neo 테마 양쪽 대응.
- 스타일 추가 위치: 기존 `#workHistoryCard` 관련 규칙 바로 아래에 `/* == Timeline Spine (career) == */` 블록.
- 필요한 클래스 (variant-B.html에서 이식):
  - `.career-timeline` — `position: relative; padding-left: 32px;`
  - `.career-spine` — 절대 위치 세로선 (2px, `--ink` 또는 `--border-primary`)
  - `.career-year-stamp` — 모노 폰트 연도, spine 좌측
  - `.career-segment` — 세그먼트 컨테이너, 좌측 도트 포함
  - `.career-dot` — 원형 마커 (현재 근무 시 `--accent-violet` 또는 민트)
  - `.career-segment.current .career-dot` — 애니메이션 펄스
  - `.career-seg-card` — 세그먼트 카드
  - `.career-seg-dept` — 부서명 타이포
  - `.career-seg-period` — 기간 + LIVE 인디케이터
  - `.career-live` — 민트 칩 ("LIVE · 약 20년")
  - `.career-rot-chip` — 로테이션 칩 (pill shape)
  - `.career-rot-chip-add` — 대시 테두리 "+ 로테이션"
  - `.career-seg-menu` — kebab 버튼
- 다크/네오 테마 토큰만 사용 (`--bg-card`, `--text-primary`, `--text-muted`, `--accent-mint-current` 등). 하드코딩된 hex 금지.

### `app.js` (핵심 로직)
- `renderWorkHistory()` 수정: `workHistoryList` 내부에 `<div class="career-timeline">` 래퍼 + `<div class="career-spine">` 삽입, 연도 스탬프 계산 후 `_renderSegment(item)` 호출.
- `_renderWorkHistoryCard` → `_renderCareerSegment`로 이름 변경 및 전체 재작성.
- `_renderRotationCard` → `_renderRotationChip`로 칩 형태 재작성 (펼침 영역에서 inline `<button class="career-rot-chip">` 생성).
- kebab 메뉴: 클릭 시 기존 `openWorkHistorySheet(item)` / `deleteWorkHistoryEntry(id)` 재사용. 심플 `confirm()`-기반 액션시트 또는 기존 패턴 따름.
- 날짜 포맷 헬퍼 `_fmtYm(iso)` 1개 추가 (`'2006-07' → '2006.07'`). 모듈 상단.

---

## 3. 단계별 실행

| # | 단계 | 검증 |
|---|------|------|
| 1 | `style.css`에 Timeline Spine 섹션 추가 (Linear + Neo 토큰 매핑) | DevTools로 `.career-timeline` 클래스 수동 삽입해 렌더 확인 |
| 2 | `app.js` 날짜 포맷 헬퍼 추가 + `_effectivePeriod` 결과 포매팅 적용 | 콘솔에서 `_fmtYm('2006-07')` → `'2006.07'` |
| 3 | `_renderCareerSegment(item, isCurrent)` 신규 작성 (기존 카드 로직은 **삭제하지 말고 주석 대신 제거**, git에 남아있음) | 단일 세그먼트 수동 마운트로 스타일/간격 확인 |
| 4 | `_renderRotationChip(parent, rot)` 칩 버전 작성 + 기존 `_renderRotationCard` 제거 | 2개 로테이션 표시, "+" 칩 → rotationSheet 열림 |
| 5 | `renderWorkHistory()` spine 래퍼 + 연도 스탬프 계산 로직 추가 | 4개 부서 시 연도 스탬프가 `from` 최솟값~현재연도 사이 정상 노출 |
| 6 | kebab 메뉴 → 편집/삭제 2항목 (기존 함수 재사용) | 편집 → `workHistorySheet` 오픈, 삭제 → confirm 후 재렌더 |
| 7 | `index.html` 상단 "+ 추가" → "+ 부서 추가"로 라벨 변경 | 시각 확인 |
| 8 | 빈 상태·시드 경로 점검 (autoSeed, empty state) | localStorage 비우고 부서·입사일 있는 프로필로 진입 → 자동 시드 + spine 렌더 |

---

## 4. 마이그레이션 & 호환성

- **데이터 스키마 불변** → 마이그레이션 스크립트 불필요. 기존 사용자 즉시 새 UI로 전환.
- **세그먼트 정렬**: 기존 `from` 내림차순(최근 상단) 유지. Spine 특성상 상단이 최신 = 직관적.
- **LIVE 판정**: `eff.to === ''` (재직 중) 인 세그먼트 1개만 `.current` 클래스.
- **연도 스탬프 알고리즘**: `[...new Set(segments.map(s => s.from.slice(0,4)))].sort().reverse()` — 부서 시작 연도 유니크만. 전 연도 나열 금지 (스파스 허용).

---

## 5. 리스크 & 롤백

- **리스크 1**: Linear 테마(기본)에서 spine 색이 어두워 안 보일 수 있음 → 토큰 `--border-primary` 대신 `--text-muted` 사용하고 두께 1.5px 실측.
- **리스크 2**: 긴 부서명 + 모바일 390px 폭 → `career-seg-card`에 `overflow: hidden; text-overflow: ellipsis` 2줄 클램프.
- **리스크 3**: `workHistorySheet` 저장 후 `renderWorkHistory()` 재호출 시 하이라이트 로직(app.js:595–603) 이 `card` DOM 참조 → 세그먼트 카드로 ID 매핑 유지 (`data-wh-id` 속성) 필요.
- **롤백**: 단일 커밋으로 진행, 문제 시 revert. feature flag는 과함(변경 범위 국소).

---

## 6. Out of Scope (이 플랜 밖)

- 다른 info 탭 섹션 (학력, 논문, 자기소개) — 추후 동일 패턴 적용 검토.
- 백엔드 API/DB 스키마 변경.
- A/B 테스트 토글.
- E2E 테스트 추가.

---

## 7. 승인 메모

- 사용자: "timeline spine으로 하자." (2026-04-15 12:58 KST)
- 평점: B=1 (rank 1 해석, 원본 `approved.json` 기록)
- 6종 variants: A~F 모두 `~/.gstack/.../career-info-tab-20260415/` 에 보존.
