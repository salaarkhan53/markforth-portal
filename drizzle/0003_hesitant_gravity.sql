CREATE TABLE `dids` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`campaign` text DEFAULT 'All campaigns' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
