ALTER TABLE "tokens" ADD COLUMN "inventory" jsonb DEFAULT '[]'::jsonb NOT NULL;
