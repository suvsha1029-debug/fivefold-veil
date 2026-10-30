CREATE TABLE `room_documents` (
	`code` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `room_expiry` ON `room_documents` (`expires_at`);