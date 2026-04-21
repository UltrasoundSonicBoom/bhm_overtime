CREATE TABLE IF NOT EXISTS "leave_records" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "type" text NOT NULL,
  "startDate" text NOT NULL,
  "endDate" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "leave_records_user_idx" ON "leave_records" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "leave_records_date_idx" ON "leave_records" USING btree ("startDate", "endDate");
