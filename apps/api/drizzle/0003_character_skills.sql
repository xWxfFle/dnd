ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "skill_proficiencies" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "save_proficiencies" jsonb DEFAULT '[]'::jsonb NOT NULL;
