ALTER TABLE "tokens" ADD COLUMN IF NOT EXISTS "abilities" jsonb;
ALTER TABLE "tokens" ADD COLUMN IF NOT EXISTS "saves" jsonb;
