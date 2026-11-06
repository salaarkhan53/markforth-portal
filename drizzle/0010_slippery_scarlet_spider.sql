CREATE TABLE `onboarding_files` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`object_key` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `onboarding_file_person_idx` ON `onboarding_files` (`person_id`);--> statement-breakpoint
CREATE TABLE `onboarding_letters` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`reference` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL,
	`request_key` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `onboarding_letters_reference_unique` ON `onboarding_letters` (`reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `onboarding_letters_request_key_unique` ON `onboarding_letters` (`request_key`);--> statement-breakpoint
CREATE INDEX `onboarding_letter_person_idx` ON `onboarding_letters` (`person_id`);--> statement-breakpoint
CREATE TABLE `onboarding_people` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`stage` text DEFAULT 'Draft' NOT NULL,
	`profile` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `onboarding_people_email_unique` ON `onboarding_people` (`email`);--> statement-breakpoint
CREATE INDEX `onboarding_people_stage_idx` ON `onboarding_people` (`stage`);