CREATE TABLE `auth_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`window_start` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`user_id` text NOT NULL,
	`tokens` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `members` ADD `auth_user_id` text;--> statement-breakpoint
ALTER TABLE `members` ADD `must_change_password` integer DEFAULT 0 NOT NULL;