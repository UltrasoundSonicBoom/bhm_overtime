# Phase 7 SPEC stub — Tailwind + 디자인 시스템

> 작성: 2026-04-27 (stub — Phase 6 완료 후 본격 상세화)
> 범위: inline style + ad-hoc CSS → Tailwind utility class + 디자인 토큰
> 전제 조건: **Phase 6 완료 필수** (Astro component 위에서 진행)

---

## 1. 배경

### 현 상태 (Phase 6 완료 시점)
- .astro component 골격 (Phase 6 산출)
- 기존 dashboard.css / style.css / schedule_suite.css 가 component 별 분산되지 않음
- inline `style="..."` attribute 광범위 (work-history.js 등의 createElement 패턴)

### 동기
- **디자인 일관성**: 색상/spacing/typography 토큰화 → ad-hoc 변형 제거
- **Tailwind utility**: component 안에서 직접 class 선언 → 별도 CSS 파일 분리 부담 ↓
- **다크 모드 / 테마 변형**: Tailwind 의 `dark:` / `data-theme="..."` variant 활용
- **번들 크기**: PurgeCSS (Tailwind JIT) 로 사용된 utility 만 출력 → CSS 크기 ↓

---

## 2. 디자인 시스템

### 토큰 (예상)
- **컬러**: primary (indigo), accent (cyan/amber), neutral, success/warning/danger
- **typography**: font-sans (system), font-mono (JetBrains Mono), 6 size step
- **spacing**: 4px base, Tailwind default scale (0.5/1/2/3/4/6/8/12/16/24/32)
- **radius**: sm/md/lg/full
- **shadow**: sm/md/lg + glass blur

### Theme variant
- `data-theme="neo"` (현 기본) → `data-theme="classic"` 같은 variant
- 다크 모드는 별도 작업 (또는 동시)

---

## 3. 구조 (예상)

```
apps/web/
├── tailwind.config.js                   ← 토큰 정의 + content scan
├── src/
│   ├── styles/
│   │   ├── globals.css                  ← Tailwind directive + 글로벌 reset
│   │   └── tokens.css                   ← 디자인 토큰 (CSS variable)
│   └── components/
│       └── HomeTab.astro                ← class="grid grid-cols-3 gap-4 p-6 ..." 직접
```

---

## 4. 핵심 변환

### Pattern A — inline style → Tailwind class

```js
// Before (work-history.js, Phase 4-A 패턴)
badge.style.cssText = 'font-size:0.65rem; padding:2px 6px; background:rgba(99,102,241,.12); color:var(--accent-indigo); border-radius:8px; margin-left:6px;';
```

```astro
<!-- After (Astro component 안) -->
<span class="text-xs px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 rounded-md ml-1.5">
  🤖 명세서 자동
</span>
```

### Pattern B — CSS file → Tailwind config

```css
/* Before (style.css) */
.btn-primary { background: #4f46e5; color: white; padding: 8px 16px; border-radius: 8px; }
```

```js
// tailwind.config.js
extend: {
  colors: {
    primary: { 500: '#4f46e5', ... },
  }
}
```

```astro
<button class="bg-primary-500 text-white px-4 py-2 rounded-lg">저장</button>
```

---

## 5. 위험

| 위험 | 강도 | 완화 |
|------|------|------|
| 색상/spacing 누락 | 🟡 중 | 토큰 inventory 사전 작업 (현 CSS grep) |
| 다크 모드 깨짐 | 🟡 중 | `data-theme` variant 기존 유지 + Tailwind `dark:` 병행 |
| inline style 잔존 (createElement 패턴) | 🟡 중 | createElement → Astro component 화 (Phase 7 의 핵심 작업) |
| 번들 크기 (Tailwind base) | 🟢 낮음 | PurgeCSS JIT 로 사용 utility 만 출력 |
| 테스트 selector 변경 | 🟡 중 | Playwright selector 가 className 의존 시 data-testid 로 마이그레이션 |

---

## 6. 마이그레이션 순서 (예상)

| Task | 범위 | 공수 |
|------|------|------|
| 7-1 | Tailwind setup + 토큰 정의 + content scan | 4-6h |
| 7-2 | 디자인 시스템 inventory (현 색상/spacing 추출) | 4-6h |
| 7-3 | Layout / shared component → Tailwind | 6-8h |
| 7-4 | 6 핵심 탭 (홈/휴가/시간외/급여/규정/개인정보) → Tailwind | 16-20h |
| 7-5 | inline style createElement → Astro component | 8-12h |
| 7-6 | 회귀 검증 + Playwright 시각 비교 | 4-6h |

**총 42~58h** (1-2주).

---

## 7. 다음

Phase 6 완료 후 본 SPEC 본격 상세화 + Phase 7 plan 작성.
