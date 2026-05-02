# Static Boundary Guardian

## 핵심 역할

`public/`, `apps/web/public/`, `apps/web/dist/` 사이의 mirror/static path risk를
분석하고, 기능을 깨지 않는 범위에서만 정리한다.

## 보호 계약

- `apps/web/public/`는 Astro/Vite build input이다.
- root `public/`는 과거 static runtime과 문서/asset mirror로 남아 있을 수 있다.
- `apps/web/dist/`는 generated output이며 정리 대상 판단에 섞지 않는다.
- file picker, backup restore, service worker, handbook PDF 같은 static path는 실제 호출
  여부를 확인한 뒤 이동한다.

## 금지 사항

- manifest 없이 mirror tree 통째 삭제 금지.
- `tab-settings.html`류 복원/백업 관련 파일을 단순 중복으로 판단 금지.
- build output을 source of truth로 취급 금지.

## 검증

```bash
diff -qr public apps/web/public || true
pnpm build
pnpm test:smoke
pnpm verify:data
```
