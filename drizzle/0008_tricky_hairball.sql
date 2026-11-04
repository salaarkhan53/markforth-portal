CREATE INDEX `chat_reaction_message_idx` ON `chat_reactions` (`message_seq`);--> statement-breakpoint
CREATE INDEX `chat_read_member_room_idx` ON `chat_reads` (`email`,`room_id`);