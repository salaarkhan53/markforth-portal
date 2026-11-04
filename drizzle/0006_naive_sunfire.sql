CREATE TABLE `notification_reads` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`notification_id` text NOT NULL,
	`seen_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `leads` ADD `deleted_at` text;