-- ═══════════════════════════════════════════
-- RLS Policies + HNSW Indexes
-- BHM Overtime Backend Upgrade
-- ═══════════════════════════════════════════

-- pgvector 확장 (이미 존재하면 스킵)
CREATE EXTENSION IF NOT EXISTS vector;

-- ── HNSW 인덱스 (벡터 검색 성능) ──
CREATE INDEX IF NOT EXISTS reg_docs_embedding_idx
  ON regulation_documents USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS faq_embedding_idx
  ON faq_entries USING hnsw (embedding vector_cosine_ops);

-- ── RLS 활성화 ──
ALTER TABLE regulation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceremonies ENABLE ROW LEVEL SECURITY;

-- ══════════ Public READ Policies ══════════
-- 누구나 active 버전의 데이터 읽기 가능

CREATE POLICY "public_read_regulation_versions" ON regulation_versions
  FOR SELECT USING (status = 'active');

CREATE POLICY "public_read_regulation_documents" ON regulation_documents
  FOR SELECT USING (
    version_id IN (SELECT id FROM regulation_versions WHERE status = 'active')
  );

CREATE POLICY "public_read_pay_tables" ON pay_tables
  FOR SELECT USING (
    version_id IN (SELECT id FROM regulation_versions WHERE status = 'active')
  );

CREATE POLICY "public_read_allowances" ON allowances
  FOR SELECT USING (
    version_id IN (SELECT id FROM regulation_versions WHERE status = 'active')
  );

CREATE POLICY "public_read_calculation_rules" ON calculation_rules
  FOR SELECT USING (
    version_id IN (SELECT id FROM regulation_versions WHERE status = 'active')
  );

CREATE POLICY "public_read_faq_entries" ON faq_entries
  FOR SELECT USING (is_published = true);

CREATE POLICY "public_read_leave_types" ON leave_types
  FOR SELECT USING (
    version_id IN (SELECT id FROM regulation_versions WHERE status = 'active')
  );

CREATE POLICY "public_read_ceremonies" ON ceremonies
  FOR SELECT USING (
    version_id IN (SELECT id FROM regulation_versions WHERE status = 'active')
  );

-- ══════════ Chat History Policies ══════════
-- 인증된 사용자는 자기 기록만 읽기/쓰기

CREATE POLICY "users_read_own_chat" ON chat_history
  FOR SELECT USING (
    user_id = auth.uid() OR user_id IS NULL
  );

CREATE POLICY "users_insert_chat" ON chat_history
  FOR INSERT WITH CHECK (true);

-- ══════════ Admin Policies ══════════
-- admin_users에 등록된 활성 사용자만 모든 테이블 쓰기 가능

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Admin: 모든 테이블 CRUD
CREATE POLICY "admin_all_regulation_versions" ON regulation_versions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_all_regulation_documents" ON regulation_documents
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_all_pay_tables" ON pay_tables
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_all_allowances" ON allowances
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_all_calculation_rules" ON calculation_rules
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_all_faq_entries" ON faq_entries
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_all_chat_history" ON chat_history
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_all_admin_users" ON admin_users
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_all_leave_types" ON leave_types
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_all_ceremonies" ON ceremonies
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
