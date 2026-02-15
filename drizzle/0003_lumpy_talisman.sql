CREATE TABLE `timelinePermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`timelineId` int NOT NULL,
	`canEdit` boolean NOT NULL DEFAULT true,
	`canDelete` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `timelinePermissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `timelines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timelines_id` PRIMARY KEY(`id`),
	CONSTRAINT `timelines_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `gestoes` ADD `timelineId` int NOT NULL;