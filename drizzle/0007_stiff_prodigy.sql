CREATE TABLE `chat_messages` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_key` text NOT NULL,
	`room_id` text NOT NULL,
	`author_email` text NOT NULL,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`mentions` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`edited_at` text,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_messages_client_key_unique` ON `chat_messages` (`client_key`);--> statement-breakpoint
CREATE INDEX `chat_room_seq_idx` ON `chat_messages` (`room_id`,`seq`);--> statement-breakpoint
CREATE TABLE `chat_reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`message_seq` integer NOT NULL,
	`email` text NOT NULL,
	`emoji` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_reads` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`room_id` text NOT NULL,
	`last_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`created_at` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
INSERT INTO chat_rooms (id,name,description,created_at,active) VALUES ('updates','Updates','Company updates and team conversations.',strftime('%Y-%m-%dT%H:%M:%fZ','now'),1),('sales-posting','Sales posting','Share wins, celebrate sales and keep the momentum going.',strftime('%Y-%m-%dT%H:%M:%fZ','now'),1);
