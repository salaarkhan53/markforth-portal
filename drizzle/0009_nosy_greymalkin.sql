CREATE TABLE `chat_files` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`message_seq` integer,
	`uploader` text NOT NULL,
	`object_key` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chat_file_message_idx` ON `chat_files` (`message_seq`);--> statement-breakpoint
CREATE TABLE `chat_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`added_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chat_membership_email_room_idx` ON `chat_memberships` (`email`,`room_id`);--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `reply_to_seq` integer;