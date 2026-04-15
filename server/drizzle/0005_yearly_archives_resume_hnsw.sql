-- D5: 연도별 아카이브 테이블
CREATE TABLE "yearly_archives" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"summary_json" jsonb NOT NULL,
	"rule_version" text,
	"archived_at" timestamp with time zone DEFAULT now(),
	"archived_by" uuid
);
--> statement-breakpoint
-- E2: AI 이력서 생성 월 1회 제한 추적 테이블
CREATE TABLE "user_resume_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"resume_generated_at" timestamp with time zone,
	CONSTRAINT "user_resume_usage_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
-- 인덱스
CREATE INDEX "yearly_archives_user_year_idx" ON "yearly_archives" USING btree ("user_id","year");
--> statement-breakpoint
CREATE UNIQUE INDEX "yearly_archives_user_year_unique" ON "yearly_archives" USING btree ("user_id","year");
--> statement-breakpoint
CREATE INDEX "user_resume_usage_user_idx" ON "user_resume_usage" USING btree ("user_id");
--> statement-breakpoint
-- P2: HNSW 인덱스 (pgvector 성능 개선 — rls-policies.sql에서 Drizzle migration으로 이전)
-- regulation_documents.embedding 과 faq_entries.embedding 에 HNSW 벡터 인덱스 생성
-- CREATE INDEX를 IF NOT EXISTS로 작성하여 rls-policies.sql과 중복 실행 안전
CREATE INDEX IF NOT EXISTS "reg_docs_embedding_idx" ON "regulation_documents" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faq_embedding_idx" ON "faq_entries" USING hnsw ("embedding" vector_cosine_ops);
