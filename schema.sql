-- ==========================================
-- Supabase Schema for bhm_overtime
-- 복사해서 Supabase Dashboard > SQL Editor 에 붙여넣고 RUN 버튼을 누르면 됩니다.
-- ==========================================

CREATE TABLE IF NOT EXISTS overtime_records (
    id TEXT PRIMARY KEY,
    user_id UUID,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    memo TEXT,
    total_hours NUMERIC,
    breakdown_json JSONB,
    estimated_pay BIGINT,
    is_weekend BOOLEAN,
    is_holiday BOOLEAN,
    hourly_rate NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT,
    gender TEXT,
    job_type TEXT,
    grade TEXT,
    year_level INTEGER,
    hire_date DATE,
    allowances_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) 설정 - 로그인한 사용자만 본인 데이터에 접근 가능
ALTER TABLE overtime_records ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재할 경우)
DROP POLICY IF EXISTS "Enable read access for all users" ON overtime_records;
DROP POLICY IF EXISTS "Enable insert access for all users" ON overtime_records;
DROP POLICY IF EXISTS "Enable update access for all users" ON overtime_records;
DROP POLICY IF EXISTS "Enable delete access for all users" ON overtime_records;

-- overtime_records: user_id가 로그인한 사용자와 일치할 때만 접근
CREATE POLICY "Users can select own records" ON overtime_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own records" ON overtime_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own records" ON overtime_records FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own records" ON overtime_records FOR DELETE USING (user_id = auth.uid());

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재할 경우)
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable update access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable delete access for all users" ON profiles;

-- profiles: id가 로그인한 사용자와 일치할 때만 접근 (id는 TEXT이므로 캐스팅)
CREATE POLICY "Users can select own profile" ON profiles FOR SELECT USING (id = auth.uid()::text);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid()::text);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid()::text);
CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING (id = auth.uid()::text);

-- ==========================================
-- 휴가 기록 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS leave_records (
    id TEXT PRIMARY KEY,
    user_id UUID,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    type TEXT NOT NULL,
    days NUMERIC,
    hours NUMERIC,
    "startTime" TEXT,
    "endTime" TEXT,
    memo TEXT,
    "isPaid" BOOLEAN,
    "usesAnnual" BOOLEAN,
    category TEXT,
    "deductType" TEXT,
    "salaryImpact" NUMERIC,
    "hourlyRate" NUMERIC,
    "monthlyBasePay" NUMERIC,
    "daysOverride" BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leave_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own leave" ON leave_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own leave" ON leave_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own leave" ON leave_records FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own leave" ON leave_records FOR DELETE USING (user_id = auth.uid());

-- ==========================================
-- 캘린더 스냅샷 (공휴일/기념일 캐시)
-- ==========================================
CREATE TABLE IF NOT EXISTS calendar_snapshots (
    id serial PRIMARY KEY,
    year integer NOT NULL,
    kind text NOT NULL,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    source text NOT NULL DEFAULT 'manual',
    refreshed_at timestamptz NOT NULL DEFAULT now(),
    refreshed_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS calendar_snapshots_year_kind_idx
    ON calendar_snapshots (year, kind);
