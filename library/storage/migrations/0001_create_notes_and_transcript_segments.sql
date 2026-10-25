CREATE TYPE "public"."note_source" AS ENUM('recording', 'text');--> statement-breakpoint
CREATE TYPE "public"."note_status" AS ENUM('recording', 'processing', 'ready');--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text DEFAULT 'Untitled note' NOT NULL,
	"source" "note_source" DEFAULT 'recording' NOT NULL,
	"status" "note_status" DEFAULT 'recording' NOT NULL,
	"keep_audio" boolean DEFAULT false NOT NULL,
	"total_chunks" integer,
	"duration_ms" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"start_ms" integer,
	"end_ms" integer,
	"raw_text" text NOT NULL,
	"edited_text" text,
	"audio_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transcript_segments_noteId_seq_unique" UNIQUE("note_id","seq")
);
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_user_id_created_at_index" ON "notes" USING btree ("user_id","created_at");