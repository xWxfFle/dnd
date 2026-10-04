CREATE TABLE "creature_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"ac" integer NOT NULL,
	"hp" integer NOT NULL,
	"speed" integer NOT NULL,
	"attacks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"abilities" jsonb NOT NULL,
	"saves" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"color" text DEFAULT '#5c4d7a' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creature_presets" ADD CONSTRAINT "creature_presets_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
