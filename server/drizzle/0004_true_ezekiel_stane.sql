CREATE TABLE "job_families" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_titles" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_family_id" integer NOT NULL,
	"title" text NOT NULL,
	"grade_band" text,
	"is_managerial" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"department_type" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_key" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"team_type" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"unit_type" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persona_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"profile_name" text NOT NULL,
	"hospital_key" text DEFAULT 'snuh' NOT NULL,
	"job_family_id" integer,
	"domain_id" integer,
	"department_id" integer,
	"unit_id" integer,
	"team_id" integer,
	"title_id" integer,
	"work_pattern" text,
	"communication_style" text,
	"pain_points" jsonb DEFAULT '[]'::jsonb,
	"ai_needs" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer NOT NULL,
	"category" text NOT NULL,
	"key" text NOT NULL,
	"value_json" jsonb NOT NULL,
	"changed_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rule_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_active" boolean DEFAULT false NOT NULL,
	"change_note" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "rule_versions_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "team_schedule_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"period_id" integer,
	"member_id" integer,
	"scope" text NOT NULL,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"start_minutes" integer,
	"end_minutes" integer,
	"all_day" boolean DEFAULT true NOT NULL,
	"blocks_work" boolean DEFAULT false NOT NULL,
	"preferred_shift_code" text,
	"coverage_delta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "managed_domain_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "managed_department_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "calculation_rules" ADD COLUMN "domain_id" integer;--> statement-breakpoint
ALTER TABLE "calculation_rules" ADD COLUMN "job_family_id" integer;--> statement-breakpoint
ALTER TABLE "calculation_rules" ADD COLUMN "rule_scope" text;--> statement-breakpoint
ALTER TABLE "faq_entries" ADD COLUMN "domain_id" integer;--> statement-breakpoint
ALTER TABLE "faq_entries" ADD COLUMN "department_id" integer;--> statement-breakpoint
ALTER TABLE "faq_entries" ADD COLUMN "job_family_id" integer;--> statement-breakpoint
ALTER TABLE "faq_entries" ADD COLUMN "persona_profile_id" integer;--> statement-breakpoint
ALTER TABLE "faq_entries" ADD COLUMN "audience_scope" text;--> statement-breakpoint
ALTER TABLE "regulation_documents" ADD COLUMN "domain_id" integer;--> statement-breakpoint
ALTER TABLE "regulation_documents" ADD COLUMN "department_id" integer;--> statement-breakpoint
ALTER TABLE "regulation_documents" ADD COLUMN "job_family_id" integer;--> statement-breakpoint
ALTER TABLE "regulation_documents" ADD COLUMN "article_scope" text;--> statement-breakpoint
ALTER TABLE "regulation_versions" ADD COLUMN "applicable_domain_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "regulation_versions" ADD COLUMN "applicable_job_family_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "org_team_id" integer;--> statement-breakpoint
ALTER TABLE "job_titles" ADD CONSTRAINT "job_titles_job_family_id_job_families_id_fk" FOREIGN KEY ("job_family_id") REFERENCES "public"."job_families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_departments" ADD CONSTRAINT "org_departments_domain_id_org_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."org_domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_teams" ADD CONSTRAINT "org_teams_unit_id_org_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."org_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_department_id_org_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."org_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_profiles" ADD CONSTRAINT "persona_profiles_job_family_id_job_families_id_fk" FOREIGN KEY ("job_family_id") REFERENCES "public"."job_families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_profiles" ADD CONSTRAINT "persona_profiles_domain_id_org_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."org_domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_profiles" ADD CONSTRAINT "persona_profiles_department_id_org_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."org_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_profiles" ADD CONSTRAINT "persona_profiles_unit_id_org_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."org_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_profiles" ADD CONSTRAINT "persona_profiles_team_id_org_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."org_teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_profiles" ADD CONSTRAINT "persona_profiles_title_id_job_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."job_titles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_entries" ADD CONSTRAINT "rule_entries_version_id_rule_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."rule_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_schedule_events" ADD CONSTRAINT "team_schedule_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_schedule_events" ADD CONSTRAINT "team_schedule_events_period_id_schedule_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."schedule_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_schedule_events" ADD CONSTRAINT "team_schedule_events_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_families_code_uidx" ON "job_families" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "job_titles_family_title_uidx" ON "job_titles" USING btree ("job_family_id","title");--> statement-breakpoint
CREATE UNIQUE INDEX "org_departments_domain_code_uidx" ON "org_departments" USING btree ("domain_id","code");--> statement-breakpoint
CREATE INDEX "org_departments_domain_idx" ON "org_departments" USING btree ("domain_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "org_domains_hospital_code_uidx" ON "org_domains" USING btree ("hospital_key","code");--> statement-breakpoint
CREATE INDEX "org_domains_hospital_idx" ON "org_domains" USING btree ("hospital_key","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "org_teams_unit_code_uidx" ON "org_teams" USING btree ("unit_id","code");--> statement-breakpoint
CREATE INDEX "org_teams_unit_idx" ON "org_teams" USING btree ("unit_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "org_units_department_code_uidx" ON "org_units" USING btree ("department_id","code");--> statement-breakpoint
CREATE INDEX "org_units_department_idx" ON "org_units" USING btree ("department_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "persona_profiles_code_uidx" ON "persona_profiles" USING btree ("code");--> statement-breakpoint
CREATE INDEX "persona_profiles_scope_idx" ON "persona_profiles" USING btree ("job_family_id","domain_id","department_id");--> statement-breakpoint
CREATE INDEX "rule_entries_version_idx" ON "rule_entries" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "rule_entries_category_idx" ON "rule_entries" USING btree ("version_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "rule_entries_version_key_idx" ON "rule_entries" USING btree ("version_id","key");--> statement-breakpoint
CREATE INDEX "rule_versions_active_idx" ON "rule_versions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "rule_versions_effective_idx" ON "rule_versions" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "team_schedule_events_team_period_idx" ON "team_schedule_events" USING btree ("team_id","period_id");--> statement-breakpoint
CREATE INDEX "team_schedule_events_member_date_idx" ON "team_schedule_events" USING btree ("member_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "team_schedule_events_scope_idx" ON "team_schedule_events" USING btree ("team_id","scope","event_type");--> statement-breakpoint
ALTER TABLE "calculation_rules" ADD CONSTRAINT "calculation_rules_domain_id_org_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."org_domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculation_rules" ADD CONSTRAINT "calculation_rules_job_family_id_job_families_id_fk" FOREIGN KEY ("job_family_id") REFERENCES "public"."job_families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_entries" ADD CONSTRAINT "faq_entries_domain_id_org_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."org_domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_entries" ADD CONSTRAINT "faq_entries_department_id_org_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."org_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_entries" ADD CONSTRAINT "faq_entries_job_family_id_job_families_id_fk" FOREIGN KEY ("job_family_id") REFERENCES "public"."job_families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_entries" ADD CONSTRAINT "faq_entries_persona_profile_id_persona_profiles_id_fk" FOREIGN KEY ("persona_profile_id") REFERENCES "public"."persona_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulation_documents" ADD CONSTRAINT "regulation_documents_domain_id_org_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."org_domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulation_documents" ADD CONSTRAINT "regulation_documents_department_id_org_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."org_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulation_documents" ADD CONSTRAINT "regulation_documents_job_family_id_job_families_id_fk" FOREIGN KEY ("job_family_id") REFERENCES "public"."job_families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_org_team_id_org_teams_id_fk" FOREIGN KEY ("org_team_id") REFERENCES "public"."org_teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calc_rules_scope_idx" ON "calculation_rules" USING btree ("domain_id","job_family_id");--> statement-breakpoint
CREATE INDEX "faq_scope_idx" ON "faq_entries" USING btree ("domain_id","department_id","job_family_id");--> statement-breakpoint
CREATE INDEX "reg_docs_scope_idx" ON "regulation_documents" USING btree ("domain_id","department_id","job_family_id");--> statement-breakpoint
CREATE INDEX "teams_org_team_idx" ON "teams" USING btree ("org_team_id");