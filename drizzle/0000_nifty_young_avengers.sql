CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calls` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`agent_email` text NOT NULL,
	`campaign` text NOT NULL,
	`taken` integer NOT NULL,
	`transferred` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`agent_email` text NOT NULL,
	`agent_name` text NOT NULL,
	`campaign` text NOT NULL,
	`phone` text NOT NULL,
	`customer` text NOT NULL,
	`age` text,
	`zip` text,
	`state` text,
	`did` text,
	`dob` text,
	`legacy` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text,
	`reviewed_by` text,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE TABLE `members` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
