-- Migration: users → UUID, user_identities, analytics_events schema changes

-- 1. Drop old users table (chatId-based)
DROP TABLE IF EXISTS "users" CASCADE;

-- 2. Create new users table (UUID-based)
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "language" text,
  "first_seen_at" timestamp DEFAULT now() NOT NULL,
  "last_seen_at" timestamp DEFAULT now() NOT NULL
);

-- 3. Create user_identities table
CREATE TABLE "user_identities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "provider_id" text NOT NULL,
  "metadata" jsonb,
  PRIMARY KEY ("provider", "provider_id")
);

ALTER TABLE "user_identities"
  ADD CONSTRAINT "user_identities_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;

-- 4. Update analytics_events: drop aggregate_id/aggregate_type, add user_id
ALTER TABLE "analytics_events" DROP COLUMN IF EXISTS "aggregate_id";
ALTER TABLE "analytics_events" DROP COLUMN IF EXISTS "aggregate_type";
ALTER TABLE "analytics_events" ADD COLUMN IF NOT EXISTS "user_id" text;
