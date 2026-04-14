-- ==========================================
-- Supabase: 런칭 관측용 뷰
-- supabase_telemetry.sql 실행 후 사용.
-- ==========================================
-- 목적: 정식 open 이후 2-4주간 기본 헬스 지표 확인용.
-- 사용: Supabase Studio SQL Editor 에서 `SELECT * FROM view_name` 으로 조회.
-- 주의: PII 포함된 컬럼 없음(anon_id 는 개인 식별 불가 난수).

-- ------------------------------------------
-- 1. DAU (일간 고유 활성 유저)
-- ------------------------------------------
-- 최근 30일 일별 고유 anon_id 수. 성장 그래프의 기본.
CREATE OR REPLACE VIEW v_dau_daily AS
SELECT
    date_trunc('day', ts)::date AS day,
    count(DISTINCT anon_id) AS dau,
    count(*) FILTER (WHERE event_type = 'app_open') AS opens,
    count(*) FILTER (WHERE event_type = 'error') AS errors
FROM app_events
WHERE ts >= now() - interval '30 days'
GROUP BY 1
ORDER BY 1 DESC;

-- ------------------------------------------
-- 2. 리텐션 (신규 유저 D1 / D7 / D30)
-- ------------------------------------------
-- first_seen_day 기준 코호트. 신규가 며칠 뒤 다시 들어왔는가.
-- 본 지표는 재방문만 본다 — 활성 사용(실제 수당 입력 등)과는 다름.
CREATE OR REPLACE VIEW v_retention_cohort AS
WITH first_seen AS (
    SELECT
        anon_id,
        date_trunc('day', min(ts))::date AS cohort_day
    FROM app_events
    GROUP BY anon_id
),
visits AS (
    SELECT DISTINCT
        anon_id,
        date_trunc('day', ts)::date AS visit_day
    FROM app_events
)
SELECT
    fs.cohort_day,
    count(DISTINCT fs.anon_id) AS cohort_size,
    count(DISTINCT v1.anon_id) FILTER (WHERE v1.visit_day = fs.cohort_day + 1) AS d1_returned,
    count(DISTINCT v7.anon_id) FILTER (WHERE v7.visit_day = fs.cohort_day + 7) AS d7_returned,
    count(DISTINCT v30.anon_id) FILTER (WHERE v30.visit_day = fs.cohort_day + 30) AS d30_returned,
    round(100.0 * count(DISTINCT v1.anon_id) FILTER (WHERE v1.visit_day = fs.cohort_day + 1)
          / NULLIF(count(DISTINCT fs.anon_id), 0), 1) AS d1_pct,
    round(100.0 * count(DISTINCT v7.anon_id) FILTER (WHERE v7.visit_day = fs.cohort_day + 7)
          / NULLIF(count(DISTINCT fs.anon_id), 0), 1) AS d7_pct
FROM first_seen fs
LEFT JOIN visits v1 ON v1.anon_id = fs.anon_id
LEFT JOIN visits v7 ON v7.anon_id = fs.anon_id
LEFT JOIN visits v30 ON v30.anon_id = fs.anon_id
WHERE fs.cohort_day >= now()::date - interval '60 days'
GROUP BY fs.cohort_day
ORDER BY fs.cohort_day DESC;

-- ------------------------------------------
-- 3. 오류율 + 상위 오류 메시지 (최근 14일)
-- ------------------------------------------
-- 런칭 후 즉시 감시. error / app_open 비율이 5% 넘으면 알람 대상.
-- payload.message 를 집계해 가장 자주 터지는 에러 10개 노출.
CREATE OR REPLACE VIEW v_error_rate_daily AS
SELECT
    date_trunc('day', ts)::date AS day,
    count(*) FILTER (WHERE event_type = 'app_open') AS opens,
    count(*) FILTER (WHERE event_type = 'error') AS errors,
    round(
        100.0 * count(*) FILTER (WHERE event_type = 'error')
        / NULLIF(count(*) FILTER (WHERE event_type = 'app_open'), 0),
        2
    ) AS error_rate_pct
FROM app_events
WHERE ts >= now() - interval '14 days'
GROUP BY 1
ORDER BY 1 DESC;

CREATE OR REPLACE VIEW v_top_errors_14d AS
SELECT
    coalesce(payload ->> 'message', '(no message)') AS message,
    count(*) AS occurrences,
    count(DISTINCT anon_id) AS unique_users,
    min(ts) AS first_seen,
    max(ts) AS last_seen
FROM app_events
WHERE event_type = 'error'
  AND ts >= now() - interval '14 days'
GROUP BY 1
ORDER BY occurrences DESC
LIMIT 20;

-- ------------------------------------------
-- 사용 예 (Supabase Studio SQL Editor)
-- ------------------------------------------
-- SELECT * FROM v_dau_daily;
-- SELECT * FROM v_retention_cohort WHERE cohort_day >= now()::date - interval '14 days';
-- SELECT * FROM v_error_rate_daily WHERE day >= now()::date - interval '7 days';
-- SELECT * FROM v_top_errors_14d;
