CREATE TYPE "public"."publish_version_status" AS ENUM('published', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."schedule_candidate_status" AS ENUM('draft', 'selected', 'published', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."schedule_period_status" AS ENUM('draft', 'review', 'published');--> statement-breakpoint
CREATE TYPE "public"."schedule_run_status" AS ENUM('queued', 'running', 'completed', 'infeasible', 'failed');--> statement-breakpoint
CREATE TYPE "public"."schedule_run_type" AS ENUM('generate', 'repair');--> statement-breakpoint
CREATE TYPE "public"."swap_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('head_nurse', 'scheduler', 'staff', 'viewer');--> statement-breakpoint
CREATE TABLE "assignment_locks" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"work_date" date NOT NULL,
	"locked_shift_code" text NOT NULL,
	"reason" text,
	"locked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "constraint_violations" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"severity" text NOT NULL,
	"rule_code" text NOT NULL,
	"message" text NOT NULL,
	"work_date" date,
	"member_id" integer,
	"details" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "coverage_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "publish_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_id" integer NOT NULL,
	"candidate_id" integer,
	"version_number" integer NOT NULL,
	"status" "publish_version_status" DEFAULT 'published' NOT NULL,
	"published_by" uuid,
	"assignments_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"diff_summary" jsonb DEFAULT '{}'::jsonb,
	"calendar_sync_state" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"candidate_key" text NOT NULL,
	"ranking" integer DEFAULT 0 NOT NULL,
	"status" "schedule_candidate_status" DEFAULT 'draft' NOT NULL,
	"score" jsonb DEFAULT '{}'::jsonb,
	"explanation" jsonb DEFAULT '{}'::jsonb,
	"assignments_snapshot" jsonb DEFAULT '[]'::jsonb,
	"violations_snapshot" jsonb DEFAULT '[]'::jsonb,
	"published_diff" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"status" "schedule_period_status" DEFAULT 'draft' NOT NULL,
	"active_rule_profile_id" integer,
	"latest_run_id" integer,
	"current_candidate_id" integer,
	"current_publish_version_id" integer,
	"request_snapshot" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"period_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"request_type" text NOT NULL,
	"request_date" date NOT NULL,
	"note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_id" integer NOT NULL,
	"run_type" "schedule_run_type" NOT NULL,
	"status" "schedule_run_status" DEFAULT 'queued' NOT NULL,
	"initiated_by" uuid,
	"input_snapshot" jsonb DEFAULT '{}'::jsonb,
	"selected_candidate_id" integer,
	"solver_engine" text,
	"summary" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shift_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"work_date" date NOT NULL,
	"shift_code" text NOT NULL,
	"source" text DEFAULT 'solver',
	"is_locked" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "shift_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"start_minutes" integer NOT NULL,
	"end_minutes" integer NOT NULL,
	"is_work" boolean DEFAULT true,
	"category" text DEFAULT 'work',
	"sort_order" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "swap_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"swap_request_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"actor_user_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "swap_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_id" integer NOT NULL,
	"publish_version_id" integer NOT NULL,
	"requester_member_id" integer NOT NULL,
	"counterparty_member_id" integer NOT NULL,
	"requester_date" date NOT NULL,
	"requester_shift_code" text NOT NULL,
	"counterparty_date" date NOT NULL,
	"counterparty_shift_code" text NOT NULL,
	"reason" text,
	"status" "swap_request_status" DEFAULT 'pending' NOT NULL,
	"requested_by" uuid,
	"decided_by" uuid,
	"requested_at" timestamp with time zone DEFAULT now(),
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_user_id" uuid,
	"employee_code" text,
	"display_name" text NOT NULL,
	"age" integer,
	"role_label" text,
	"skill_tags" jsonb DEFAULT '[]'::jsonb,
	"fte_permille" integer DEFAULT 1000 NOT NULL,
	"can_night" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"team_role" "team_role" DEFAULT 'staff' NOT NULL,
	"is_primary" boolean DEFAULT true,
	"joined_at" timestamp with time zone DEFAULT now(),
	"ended_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "team_rule_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"hospital_rule_version" text,
	"structured_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scoring_weights" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_subdomains" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"slug" text NOT NULL,
	"hostname" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "assignment_locks" ADD CONSTRAINT "assignment_locks_period_id_schedule_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."schedule_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_locks" ADD CONSTRAINT "assignment_locks_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constraint_violations" ADD CONSTRAINT "constraint_violations_candidate_id_schedule_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."schedule_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constraint_violations" ADD CONSTRAINT "constraint_violations_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coverage_templates" ADD CONSTRAINT "coverage_templates_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_versions" ADD CONSTRAINT "publish_versions_period_id_schedule_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."schedule_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_versions" ADD CONSTRAINT "publish_versions_candidate_id_schedule_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."schedule_candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_candidates" ADD CONSTRAINT "schedule_candidates_run_id_schedule_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."schedule_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_periods" ADD CONSTRAINT "schedule_periods_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_requests" ADD CONSTRAINT "schedule_requests_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_requests" ADD CONSTRAINT "schedule_requests_period_id_schedule_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."schedule_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_requests" ADD CONSTRAINT "schedule_requests_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_runs" ADD CONSTRAINT "schedule_runs_period_id_schedule_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."schedule_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_candidate_id_schedule_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."schedule_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_types" ADD CONSTRAINT "shift_types_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_events" ADD CONSTRAINT "swap_events_swap_request_id_swap_requests_id_fk" FOREIGN KEY ("swap_request_id") REFERENCES "public"."swap_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_period_id_schedule_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."schedule_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_publish_version_id_publish_versions_id_fk" FOREIGN KEY ("publish_version_id") REFERENCES "public"."publish_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_requester_member_id_team_members_id_fk" FOREIGN KEY ("requester_member_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_counterparty_member_id_team_members_id_fk" FOREIGN KEY ("counterparty_member_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_rule_profiles" ADD CONSTRAINT "team_rule_profiles_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_subdomains" ADD CONSTRAINT "team_subdomains_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_locks_period_member_date_uidx" ON "assignment_locks" USING btree ("period_id","member_id","work_date");--> statement-breakpoint
CREATE INDEX "constraint_violations_candidate_idx" ON "constraint_violations" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "constraint_violations_rule_idx" ON "constraint_violations" USING btree ("rule_code");--> statement-breakpoint
CREATE INDEX "coverage_templates_team_active_idx" ON "coverage_templates" USING btree ("team_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "publish_versions_period_version_uidx" ON "publish_versions" USING btree ("period_id","version_number");--> statement-breakpoint
CREATE INDEX "publish_versions_status_idx" ON "publish_versions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_candidates_run_key_uidx" ON "schedule_candidates" USING btree ("run_id","candidate_key");--> statement-breakpoint
CREATE INDEX "schedule_candidates_status_idx" ON "schedule_candidates" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_periods_team_month_uidx" ON "schedule_periods" USING btree ("team_id","year","month");--> statement-breakpoint
CREATE INDEX "schedule_periods_status_idx" ON "schedule_periods" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_requests_team_period_member_date_type_uidx" ON "schedule_requests" USING btree ("team_id","period_id","member_id","request_date","request_type");--> statement-breakpoint
CREATE INDEX "schedule_requests_member_idx" ON "schedule_requests" USING btree ("member_id","request_date");--> statement-breakpoint
CREATE INDEX "schedule_runs_period_idx" ON "schedule_runs" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "schedule_runs_status_idx" ON "schedule_runs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "shift_assignments_candidate_member_date_uidx" ON "shift_assignments" USING btree ("candidate_id","member_id","work_date");--> statement-breakpoint
CREATE INDEX "shift_assignments_member_idx" ON "shift_assignments" USING btree ("member_id","work_date");--> statement-breakpoint
CREATE UNIQUE INDEX "shift_types_team_code_uidx" ON "shift_types" USING btree ("team_id","code");--> statement-breakpoint
CREATE INDEX "swap_events_request_idx" ON "swap_events" USING btree ("swap_request_id","created_at");--> statement-breakpoint
CREATE INDEX "swap_requests_period_idx" ON "swap_requests" USING btree ("period_id","status");--> statement-breakpoint
CREATE INDEX "swap_requests_publish_idx" ON "swap_requests" USING btree ("publish_version_id");--> statement-breakpoint
CREATE INDEX "team_members_external_uid_idx" ON "team_members" USING btree ("external_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_memberships_team_member_uidx" ON "team_memberships" USING btree ("team_id","member_id");--> statement-breakpoint
CREATE INDEX "team_memberships_role_idx" ON "team_memberships" USING btree ("team_role");--> statement-breakpoint
CREATE UNIQUE INDEX "team_rule_profiles_team_version_uidx" ON "team_rule_profiles" USING btree ("team_id","version");--> statement-breakpoint
CREATE INDEX "team_rule_profiles_active_idx" ON "team_rule_profiles" USING btree ("team_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "team_subdomains_slug_uidx" ON "team_subdomains" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "team_subdomains_hostname_uidx" ON "team_subdomains" USING btree ("hostname");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_slug_uidx" ON "teams" USING btree ("slug");