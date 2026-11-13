CREATE TABLE `relay_grants` (
	`recipient` text NOT NULL,
	`sender` text NOT NULL,
	PRIMARY KEY(`recipient`, `sender`)
);
--> statement-breakpoint
CREATE TABLE `relay_mailboxes` (
	`identity` text PRIMARY KEY NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `relay_messages` (
	`sender` text NOT NULL,
	`id` text NOT NULL,
	`recipient` text NOT NULL,
	`digest` text NOT NULL,
	`envelope` text,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`sender`, `id`)
);
--> statement-breakpoint
CREATE INDEX `relay_messages_recipient` ON `relay_messages` (`recipient`,`expires`);--> statement-breakpoint
CREATE INDEX `relay_messages_created` ON `relay_messages` (`sender`,`created`);--> statement-breakpoint
CREATE INDEX `relay_messages_expires` ON `relay_messages` (`expires`);--> statement-breakpoint
CREATE TABLE `relay_nonces` (
	`identity` text NOT NULL,
	`nonce` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`identity`, `nonce`)
);
--> statement-breakpoint
CREATE INDEX `relay_nonces_created` ON `relay_nonces` (`created`);