-- ============================================================
-- Migration: 일반 사용자 페이지 Supabase 통합 제거 (2026-04-19)
-- 실행 완료: Supabase MCP `apply_migration` 으로 적용 (2026-04-19)
-- ============================================================
-- 결정 배경:
--   2026-04-02 ~ 2026-04-19 동안 redirect_uri_mismatch + Unacceptable audience
--   도돌이표 3회. 실제 효용 검증:
--   - user_data_blobs.row_count = 0 (한 번도 사용 못함)
--   - auth.users 2명은 어드민에서 04-02 가입, 04-04 마지막 로그인
--   결정: 일반 사용자 페이지에서 Supabase 통합 완전 제거.
--   Drive 단독 저장 + Sentry 텔레메트리.
--   어드민 페이지 (admin/, nurse_admin/) 는 Supabase 계속 사용.
-- ============================================================

DROP TABLE IF EXISTS user_data_blobs CASCADE;
DROP TABLE IF EXISTS app_events CASCADE;
DROP FUNCTION IF EXISTS public._bhm_set_updated_at() CASCADE;

-- 이전 migration 들 (참고용 — 더 이상 적용 불필요):
-- - 20260419_user_data_rls.sql: user_data_blobs 생성 (이 migration으로 drop)
-- - 20260419_app_events.sql: app_events 생성 (이 migration으로 drop)
