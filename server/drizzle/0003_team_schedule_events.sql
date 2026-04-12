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
ALTER TABLE "team_schedule_events" ADD CONSTRAINT "team_schedule_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_schedule_events" ADD CONSTRAINT "team_schedule_events_period_id_schedule_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."schedule_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_schedule_events" ADD CONSTRAINT "team_schedule_events_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_schedule_events_team_period_idx" ON "team_schedule_events" USING btree ("team_id","period_id");--> statement-breakpoint
CREATE INDEX "team_schedule_events_member_date_idx" ON "team_schedule_events" USING btree ("member_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "team_schedule_events_scope_idx" ON "team_schedule_events" USING btree ("team_id","scope","event_type");--> statement-breakpoint
