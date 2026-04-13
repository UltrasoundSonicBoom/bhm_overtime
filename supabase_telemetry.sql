-- ==========================================
-- Supabase: 익명 텔레메트리 테이블
-- SQL Editor에 붙여넣고 RUN.
-- ==========================================
-- 목적: 앱 사용량 / 오류 집계용. PII(이름·사번·급여·연락처)는 절대 저장하지 않음.

CREATE TABLE IF NOT EXISTS app_events (
    id BIGSERIAL PRIMARY KEY,
    anon_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB,
    app_version TEXT,
    user_agent TEXT,
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_events_ts ON app_events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_type_ts ON app_events (event_type, ts DESC);

ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

-- 익명 anon key로 INSERT만 허용, SELECT는 서비스 role만.
DROP POLICY IF EXISTS "anon insert app_events" ON app_events;
CREATE POLICY "anon insert app_events"
    ON app_events FOR INSERT
    TO anon
    WITH CHECK (true);

-- 필요 시 보관기간 제한(예: 90일) - 선택
-- DELETE FROM app_events WHERE created_at < now() - interval '90 days';
