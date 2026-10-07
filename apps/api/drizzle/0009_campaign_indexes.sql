CREATE INDEX "characters_campaign_id_idx" ON "characters" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "scenes_campaign_id_idx" ON "scenes" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "tokens_scene_id_idx" ON "tokens" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "tokens_character_id_idx" ON "tokens" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "combats_scene_id_idx" ON "combats" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "combatants_combat_id_idx" ON "combatants" USING btree ("combat_id");--> statement-breakpoint
CREATE INDEX "dice_rolls_campaign_created_idx" ON "dice_rolls" USING btree ("campaign_id","created_at");--> statement-breakpoint
CREATE INDEX "creature_presets_campaign_id_idx" ON "creature_presets" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "srd_entries_kind_idx" ON "srd_entries" USING btree ("kind");
