CREATE TYPE "public"."admin_role" AS ENUM('super_admin', 'hr_admin', 'union_admin', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."regulation_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "admin_role" DEFAULT 'viewer' NOT NULL,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "admin_users_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "allowances" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"label" text,
	"category" text
);
--> statement-breakpoint
CREATE TABLE "calculation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer NOT NULL,
	"rule_type" text NOT NULL,
	"rule_key" text NOT NULL,
	"rule_data" jsonb NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "ceremonies" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"leave_days" text,
	"hospital_pay" integer,
	"pension_pay" text,
	"coop_pay" text,
	"docs" text
);
--> statement-breakpoint
CREATE TABLE "chat_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"source_docs" jsonb,
	"model" text,
	"token_usage" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "faq_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer,
	"category" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"article_ref" text,
	"embedding" vector(1536),
	"sort_order" integer DEFAULT 0,
	"is_published" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer NOT NULL,
	"type_id" text NOT NULL,
	"label" text NOT NULL,
	"category" text,
	"is_paid" boolean DEFAULT true,
	"quota" integer,
	"uses_annual" boolean DEFAULT false,
	"deduct_type" text DEFAULT 'none',
	"gender" text,
	"article_ref" text,
	"extra_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "pay_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer NOT NULL,
	"pay_table_name" text NOT NULL,
	"grade" text NOT NULL,
	"grade_label" text,
	"base_pay" jsonb NOT NULL,
	"ability_pay" integer,
	"bonus" integer,
	"family_support" integer
);
--> statement-breakpoint
CREATE TABLE "regulation_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"source_file" text,
	"section_title" text,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"token_count" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "regulation_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"title" text NOT NULL,
	"status" "regulation_status" DEFAULT 'draft' NOT NULL,
	"effective_date" date,
	"source_files" jsonb DEFAULT '[]'::jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "allowances" ADD CONSTRAINT "allowances_version_id_regulation_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."regulation_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculation_rules" ADD CONSTRAINT "calculation_rules_version_id_regulation_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."regulation_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ceremonies" ADD CONSTRAINT "ceremonies_version_id_regulation_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."regulation_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_entries" ADD CONSTRAINT "faq_entries_version_id_regulation_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."regulation_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_version_id_regulation_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."regulation_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_tables" ADD CONSTRAINT "pay_tables_version_id_regulation_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."regulation_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulation_documents" ADD CONSTRAINT "regulation_documents_version_id_regulation_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."regulation_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_uid_idx" ON "admin_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "allowances_version_idx" ON "allowances" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "calc_rules_version_idx" ON "calculation_rules" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "ceremonies_version_idx" ON "ceremonies" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "chat_session_idx" ON "chat_history" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "chat_user_idx" ON "chat_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "faq_version_idx" ON "faq_entries" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "faq_category_idx" ON "faq_entries" USING btree ("category");--> statement-breakpoint
CREATE INDEX "leave_types_version_idx" ON "leave_types" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "pay_tables_version_idx" ON "pay_tables" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "reg_docs_version_idx" ON "regulation_documents" USING btree ("version_id");