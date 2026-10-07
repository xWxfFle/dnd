ALTER TABLE "characters" ADD COLUMN "expertise_skills" jsonb DEFAULT '[]'::jsonb NOT NULL;
