CREATE TABLE `invitations` (
	`email` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`last_attempt` text,
	`provider_id` text,
	`error` text,
	`payload` text
);
--> statement-breakpoint
ALTER TABLE `calls` ADD `did` text DEFAULT '' NOT NULL;