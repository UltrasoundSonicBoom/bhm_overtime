CREATE TABLE "rag_chunks_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"doc_id" text,
	"chapter" text,
	"article_title" text,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"token_count" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_resume_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"resume_generated_at" timestamp with time zone,
	CONSTRAINT "user_resume_usage_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
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
CREATE INDEX "rag_v2_source_idx" ON "rag_chunks_v2" USING btree ("source");--> statement-breakpoint
CREATE INDEX "rag_v2_doc_idx" ON "rag_chunks_v2" USING btree ("doc_id");--> statement-breakpoint
CREATE INDEX "user_resume_usage_user_idx" ON "user_resume_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "yearly_archives_user_year_idx" ON "yearly_archives" USING btree ("user_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "yearly_archives_user_year_unique" ON "yearly_archives" USING btree ("user_id","year");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rag_v2_embedding_idx
  ON rag_chunks_v2 USING hnsw (embedding vector_cosine_ops);