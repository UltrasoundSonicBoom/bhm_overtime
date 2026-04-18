-- ============================================================
-- Migration: user_data_blobs + RLS
-- 실행: Supabase Dashboard → SQL Editor → Run
-- ============================================================
--
-- 사전 설정 (코드 실행 전 Supabase Dashboard 에서 한 번만):
--   1. Authentication → Providers → Google → Enable
--      Client ID: (config.js 의 googleClientId 값)
--      Client Secret: GCP Console → OAuth 2.0 클라이언트 → 클라이언트 보안 비밀번호
--   2. Authentication → URL Configuration → Redirect URLs 에
--      운영 도메인 추가 (예: https://yourdomain.com)
-- ============================================================

-- ── user_data_blobs ──────────────────────────────────────────
-- localStorage JSON blob 구조를 그대로 서버에 미러링.
-- data_type: 'overtime' | 'leave' | 'profile' | 'applock' | 'overtime_payslip'
-- RLS: 인증된 사용자가 자기 rows 만 CRUD.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_data_blobs (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_type   text NOT NULL,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, data_type),
  CONSTRAINT valid_data_type CHECK (
    data_type IN ('overtime', 'leave', 'profile', 'applock', 'overtime_payslip')
  )
);

ALTER TABLE user_data_blobs ENABLE ROW LEVEL SECURITY;

-- 단일 포괄 정책: 인증 사용자가 자기 rows 전체 접근
DROP POLICY IF EXISTS "users own data blobs" ON user_data_blobs;
CREATE POLICY "users own data blobs"
  ON user_data_blobs
  FOR ALL
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION _bhm_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_data_blobs_updated_at ON user_data_blobs;
CREATE TRIGGER user_data_blobs_updated_at
  BEFORE UPDATE ON user_data_blobs
  FOR EACH ROW EXECUTE FUNCTION _bhm_set_updated_at();

-- 조회 성능 인덱스 (user_id 단독 조회 시)
CREATE INDEX IF NOT EXISTS idx_user_data_blobs_user ON user_data_blobs (user_id);

-- ── app_events: 기존 telemetry 테이블 보완 ───────────────────
-- app_events가 이미 존재할 때만 user_id 컬럼 추가 (없으면 skip)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_events') THEN
    ALTER TABLE app_events ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
  END IF;
END;
$$;
