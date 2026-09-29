ALTER TABLE "tokens" ADD COLUMN IF NOT EXISTS "ac" integer;
ALTER TABLE "tokens" ADD COLUMN IF NOT EXISTS "speed" integer;
ALTER TABLE "tokens" ADD COLUMN IF NOT EXISTS "attacks" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "tokens" ADD COLUMN IF NOT EXISTS "image_path" text;
