# Phase 6 Task 6 — Vercel monorepo 배포 + URL rewrite + 종합 회귀

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** apps/web 빌드 결과를 Vercel 에 배포 + URL rewrite 으로 사용자 북마크 호환 + 라이브 회귀 가드 GREEN.

**전제 조건**: Phase 6 Task 4-5 완료 (apps/web/src/pages/* + components/tabs/*Island.astro 모두).

---

## Sub-task 6-1: vercel.json monorepo 설정

**Files:**
- Modify: `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm install --frozen-lockfile && pnpm --filter @snuhmate/web build",
  "outputDirectory": "apps/web/dist",
  "installCommand": "echo 'install in buildCommand'",
  "rewrites": [
    {
      "source": "/index.html",
      "destination": "/app/"
    }
  ],
  "redirects": [
    {
      "source": "/",
      "has": [{ "type": "query", "key": "app", "value": "1" }],
      "destination": "/app",
      "permanent": false
    }
  ],
  "headers": [
    /* 기존 CSP / Cache-Control 헤더 그대로 (Phase 5-followup 산출) */
  ]
}
```

- [ ] 작성
- [ ] 로컬 build 검증 (`pnpm --filter @snuhmate/web build` → apps/web/dist 생성)
- [ ] 커밋

---

## Sub-task 6-2: Vercel preview 배포 + 라이브 검증

- [ ] `git push origin feat/phase6-astro-turbo-ts`
- [ ] Vercel preview URL 확인 (Vercel dashboard 또는 PR comment)
- [ ] Playwright preview URL 검증:
  - `/` → onboarding 표시
  - `/?app=1` → `/app` redirect
  - `/app` → SPA 메인 + 6 tab 동작
  - `/regulation` `/retirement` 등 정상
  - 콘솔 에러 0
  - 사용자 시나리오: 명세서 시드 → info 탭 form 자동 채움 (Phase 5-followup 회귀 가드)

---

## Sub-task 6-3: 종합 회귀 + main 머지

- [ ] `pnpm test:unit` 175 PASS
- [ ] `pnpm test:integration` 70+ PASS
- [ ] `pnpm lint` 0 error
- [ ] `pnpm --filter @snuhmate/web build` GREEN
- [ ] main 머지 + production 배포

```bash
git checkout main
git merge --ff-only feat/phase6-astro-turbo-ts
git push origin main
git worktree remove ../bhm_overtime-phase6
git branch -d feat/phase6-astro-turbo-ts
```

---

## Sub-task 6-4: Production 라이브 검증 (snuhmate.com)

- [ ] Playwright 9 page 모두 콘솔 에러 0
- [ ] localStorage 키 = `snuhmate_*` (Plan 2 lazy migration 그대로)
- [ ] 사용자 데이터 무중단 (PROFILE/work-history/payslip 모두 보존)
- [ ] URL 호환: 옛 북마크 (`/index.html?app=1`) → `/app` redirect 작동
- [ ] SW v10 → v11 bump 후 cache 갱신 확인

---

## Sub-task 6-5: 사용자 안내 banner (1개월)

```astro
<!-- apps/web/src/components/UrlChangeBanner.astro -->
<div id="urlChangeBanner" style="...">
  💡 URL 이 단순해졌습니다. 새 북마크: <code>snuhmate.com/app</code>
  <button data-action="dismissUrlBanner">×</button>
</div>
```

- [ ] localStorage `snuhmate_url_banner_dismissed` 플래그로 1회만 표시
- [ ] 1개월 후 banner 코드 자동 제거 (별도 cleanup plan)

---

## Sub-task 6-6: root *.html / *.js cleanup

apps/web 으로 모두 이전된 후 root 정리:

- [ ] root `*.html` 9개 삭제
- [ ] root `*.js` 30+ 모두 삭제 (apps/web/src/client/ 또는 packages/* 으로 이전 완료)
- [ ] root `style.css`, `style.dark.css`, `regulation.css` 삭제 (apps/web/src/styles/)
- [ ] root `vite.config.js` 삭제 (apps/web 자체 Astro config)
- [ ] root `eslint.config.js` 보존 (workspace 공통)
- [ ] tests/ 보존 (workspace 공통)

```bash
git rm *.html *.js style.css style.dark.css regulation.css vite.config.js
git commit -m "chore(phase6-cleanup): root *.html / *.js 제거 (apps/web 으로 이전 완료)"
git push
```
