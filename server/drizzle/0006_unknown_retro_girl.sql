-- user_sync_items: 멀티디바이스 동기화 blob-first 테이블
CREATE TABLE IF NOT EXISTS "user_sync_items" (
	"user_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_device_id" text,
	CONSTRAINT "user_sync_items_user_id_item_key_pk" PRIMARY KEY("user_id","item_key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sync_items_user_idx" ON "user_sync_items" USING btree ("user_id");
