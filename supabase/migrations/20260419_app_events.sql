-- ============================================================
-- Migration: app_events (익명 telemetry 테이블)
-- 실행: Supabase Dashboard → SQL Editor → Run
-- ============================================================
-- 용도: supabaseClient.js의 SupabaseTelemetry가 insert 하는 테이블.
-- PII 없음: anon_id (재방문 식별용 랜덤 ID), event_type, payload (2KB 이내), app_version, user_agent.
-- RLS: 익명 insert 허용, select 차단 (운영자만 Dashboard에서 조회).
-- ============================================================

CREATE TABLE IF NOT EXISTS app_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  anon_id     text NOT NULL,
  event_type  text NOT NULL,
  payload     jsonb,
  app_version text,
  user_agent  text,
  ts          timestamptz NOT NULL DEFAULT now(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 조회 인덱스 (최근 이벤트 → 운영 대시보드)
CREATE INDEX IF NOT EXISTS idx_app_events_ts ON app_events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_type ON app_events (event_type, ts DESC);

ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

-- 익명 insert 허용 (anon 키로 insert 가능), select 전체 차단
DROP POLICY IF EXISTS "anon can insert events" ON app_events;
CREATE POLICY "anon can insert events"
  ON app_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 운영자만 Dashboard에서 조회 (RLS로 클라이언트 차단, service_role 키는 bypass)
DROP POLICY IF EXISTS "no client select" ON app_events;
-- 정책을 만들지 않으면 기본 차단. 명시적 policy 없음 = RLS에서 deny.
