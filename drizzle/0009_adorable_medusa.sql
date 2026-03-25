CREATE TABLE "users" (
	"chat_id" bigint PRIMARY KEY NOT NULL,
	"username" text,
	"first_name" text NOT NULL,
	"last_name" text,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
