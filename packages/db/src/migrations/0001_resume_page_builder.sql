-- Resume page builder: custom sections + template registry
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "custom_sections" jsonb;

CREATE TABLE IF NOT EXISTS "resume_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "slug" varchar(60) NOT NULL,
  "name" varchar(100) NOT NULL,
  "region" varchar(30) NOT NULL DEFAULT 'general',
  "description" text,
  "config" jsonb NOT NULL,
  "preview_image_url" varchar(500),
  "is_built_in" boolean NOT NULL DEFAULT false,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "resume_templates_user_idx" ON "resume_templates" ("user_id");
