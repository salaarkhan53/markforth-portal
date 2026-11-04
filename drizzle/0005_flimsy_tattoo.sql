CREATE TABLE `agent_photos` (
	`agent_key` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bonus_awards` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge_id` text NOT NULL,
	`agent_email` text NOT NULL,
	`agent_name` text NOT NULL,
	`amount` integer NOT NULL,
	`earned_at` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bonus_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`target` integer NOT NULL,
	`amount` integer NOT NULL,
	`campaign` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
